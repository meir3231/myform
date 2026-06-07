"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { readPdfMeta } from "@/lib/pdf/server";
import { FIELD_TYPES, type FieldDraft } from "@/lib/fields";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendFormLinkEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";

// מאמת שהטופס שייך לארגון של המנהל המחובר. מחזיר את הטופס.
async function assertFormOwnership(formId: string) {
  const { profile, supabase } = await requireProfile();
  const { data: form } = await supabase
    .from("forms")
    .select("id, org_id, page_count")
    .eq("id", formId)
    .single();
  if (!form || form.org_id !== profile.org_id) throw new Error("טופס לא נמצא");
  return { form, profile };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export async function saveFormFields(formId: string, fields: FieldDraft[]) {
  const { form } = await assertFormOwnership(formId);
  const admin = createAdminClient();

  // ולידציה + נירמול קואורדינטות לטווח חוקי
  const rows = fields.map((f, i) => {
    if (!FIELD_TYPES.includes(f.type)) throw new Error("סוג שדה לא חוקי: " + f.type);
    const page = Math.min(Math.max(1, Math.round(f.page)), form.page_count);
    return {
      form_id: formId,
      page,
      x: clamp01(f.x),
      y: clamp01(f.y),
      width: clamp01(f.width),
      height: clamp01(f.height),
      type: f.type,
      label: (f.label || "").slice(0, 200),
      required: !!f.required,
      font_size: Math.min(Math.max(6, f.font_size || 12), 72),
      sort_order: i,
    };
  });

  // החלפה מלאה: מחיקת השדות הקיימים והכנסת החדשים
  const { error: delErr } = await admin.from("form_fields").delete().eq("form_id", formId);
  if (delErr) throw new Error("שמירת השדות נכשלה: " + delErr.message);

  if (rows.length > 0) {
    const { error: insErr } = await admin.from("form_fields").insert(rows);
    if (insErr) throw new Error("שמירת השדות נכשלה: " + insErr.message);
  }

  revalidatePath(`/forms/${formId}/edit`);
  return { ok: true };
}

export type SendActionState = {
  error?: string;
  link?: string;
  emailSent?: boolean;
  emailError?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// יוצר שליחה ללקוח: טוקן + רשומה + משלוח מייל. תואם useActionState.
export async function createSubmission(
  formId: string,
  _prev: SendActionState,
  formData: FormData
): Promise<SendActionState> {
  const { profile } = await assertFormOwnership(formId);
  const admin = createAdminClient();

  const recipientName = (formData.get("recipient_name") as string)?.trim();
  const recipientEmail = (formData.get("recipient_email") as string)?.trim().toLowerCase();
  const expiryDays = Math.min(
    Math.max(1, Number(formData.get("expiry_days")) || 14),
    90
  );

  if (!recipientName) return { error: "יש להזין שם לקוח" };
  if (!recipientEmail || !EMAIL_RE.test(recipientEmail))
    return { error: "כתובת אימייל לא תקינה" };

  // ודא שלטופס יש לפחות שדה אחד
  const { count } = await admin
    .from("form_fields")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId);
  if (!count || count === 0)
    return { error: "לטופס אין שדות. הגדר שדות בעורך לפני השליחה." };

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: submission, error: insErr } = await admin
    .from("submissions")
    .insert({
      form_id: formId,
      org_id: profile.org_id,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      token_hash: tokenHash,
      status: "pending",
      expires_at: expiresAt,
      sent_at: new Date().toISOString(),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (insErr || !submission) return { error: "יצירת השליחה נכשלה: " + insErr?.message };

  const { appUrl } = serverEnv();
  const link = `${appUrl}/fill/${token}`;

  // שם הטופס לצורך המייל
  const { data: formRow } = await admin
    .from("forms")
    .select("name")
    .eq("id", formId)
    .single();

  const emailResult = await sendFormLinkEmail({
    to: recipientEmail,
    recipientName,
    formName: formRow?.name ?? "טופס",
    link,
  });

  revalidatePath("/submissions");
  return { link, emailSent: emailResult.sent, emailError: emailResult.error };
}


export type FormActionState = { error?: string };

// תואם ל-useActionState. מחזיר שגיאות; בהצלחה מפנה לעורך.
export async function createForm(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const { profile } = await requireProfile();

  const name = (formData.get("name") as string)?.trim();
  const file = formData.get("file") as File | null;

  if (!name) return { error: "יש להזין שם לטופס" };
  if (!file || file.size === 0) return { error: "יש לבחור קובץ PDF" };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "הקובץ חייב להיות PDF" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let pageCount = 1;
  try {
    ({ pageCount } = await readPdfMeta(bytes));
  } catch {
    return { error: "לא ניתן לקרוא את קובץ ה-PDF. ודא שהוא תקין." };
  }

  const formId = randomUUID();
  const path = `${profile.org_id}/${formId}/original.pdf`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("originals")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) return { error: "העלאת הקובץ נכשלה: " + uploadError.message };

  const { error: insertError } = await admin.from("forms").insert({
    id: formId,
    org_id: profile.org_id,
    name,
    original_pdf_path: path,
    page_count: pageCount,
    created_by: profile.id,
  });
  if (insertError) {
    // ניקוי הקובץ שהועלה אם רשומת ה-DB נכשלה
    await admin.storage.from("originals").remove([path]);
    return { error: "שמירת הטופס נכשלה: " + insertError.message };
  }

  revalidatePath("/dashboard");
  redirect(`/forms/${formId}/edit`);
}

export async function deleteForm(formId: string) {
  const { profile, supabase } = await requireProfile();

  // RLS מוודא שהטופס שייך לארגון; קוראים קודם את הנתיב לניקוי האחסון.
  const { data: form } = await supabase
    .from("forms")
    .select("id, original_pdf_path, org_id")
    .eq("id", formId)
    .single();

  if (!form || form.org_id !== profile.org_id) throw new Error("טופס לא נמצא");

  const admin = createAdminClient();
  await admin.from("forms").delete().eq("id", formId);
  await admin.storage.from("originals").remove([form.original_pdf_path]);

  revalidatePath("/dashboard");
}
