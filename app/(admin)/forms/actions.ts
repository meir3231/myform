"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { assertCanEdit } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { readPdfMeta } from "@/lib/pdf/server";
import { FIELD_TYPES, type FieldDraft } from "@/lib/fields";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendFormLinkEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

// מאמת שהטופס שייך לארגון של המנהל המחובר. מחזיר את הטופס.
async function assertFormOwnership(formId: string) {
  if (!UUID_RE.test(formId)) throw new Error("מזהה טופס לא תקין");
  const { profile, supabase } = await requireProfile();
  assertCanEdit(profile.role);
  const { data: form } = await supabase
    .from("forms")
    .select("id, org_id, name, page_count, archived_at")
    .eq("id", formId)
    .single();
  if (!form || form.org_id !== profile.org_id) throw new Error("טופס לא נמצא");
  return { form, profile };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export async function saveFormFields(formId: string, fields: FieldDraft[]) {
  const { form } = await assertFormOwnership(formId);
  const admin = createAdminClient();

  const validIds = new Set(fields.map((f) => f.id));

  // ולידציה + נירמול קואורדינטות לטווח חוקי
  // שומרים על ה-id המקורי של כל שדה (במקום לתת ל-DB ליצור id חדש בכל שמירה),
  // כך ש-submission_values וקישורי copy_from_field_id ימשיכו להצביע נכון
  // גם אחרי עריכות חוזרות.
  const rows = fields.map((f, i) => {
    if (!FIELD_TYPES.includes(f.type)) throw new Error("סוג שדה לא חוקי: " + f.type);
    const page = Math.min(Math.max(1, Math.round(f.page)), form.page_count);
    // קישור תקף רק אם המקור הוא שדה אחר באותו טופס שנשמר כעת
    const copyFrom = f.copyFrom && f.copyFrom !== f.id && validIds.has(f.copyFrom)
      ? f.copyFrom
      : null;
    return {
      id: f.id,
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
      copyFrom,
      auto_fill_today: !!f.autoFillToday,
    };
  });

  // החלפה מלאה: מחיקת השדות הקיימים והכנסת החדשים
  const { error: delErr } = await admin.from("form_fields").delete().eq("form_id", formId);
  if (delErr) throw new Error("שמירת השדות נכשלה: " + delErr.message);

  if (rows.length > 0) {
    // שלב 1: הכנסת כל השדות בלי קישורי העתקה — נמנעים מבעיית סדר ב-FK
    // (שדה A יכול להצביע על שדה B שעדיין לא הוכנס לאותה הכנסה מרובת-שורות).
    const { error: insErr } = await admin.from("form_fields").insert(
      rows.map(({ copyFrom, ...row }) => row)
    );
    if (insErr) throw new Error("שמירת השדות נכשלה: " + insErr.message);

    // שלב 2: עדכון קישורי ההעתקה — כל ה-updates מקבילים
    const linkUpdates = rows
      .filter((row) => row.copyFrom)
      .map((row) =>
        admin.from("form_fields").update({ copy_from_field_id: row.copyFrom }).eq("id", row.id)
      );
    const linkResults = await Promise.all(linkUpdates);
    for (const { error: linkErr } of linkResults) {
      if (linkErr) throw new Error("שמירת קישורי השדות נכשלה: " + linkErr.message);
    }
  }

  revalidatePath(`/forms/${formId}/edit`);
  return { ok: true };
}

export type SendActionState = {
  error?: string;
  link?: string;
  emailSent?: boolean;
  emailError?: string;
  submissionId?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// יוצר שליחה ללקוח: טוקן + רשומה + משלוח מייל. תואם useActionState.
export async function createSubmission(
  formId: string,
  _prev: SendActionState,
  formData: FormData
): Promise<SendActionState> {
  const { form, profile } = await assertFormOwnership(formId);
  if (form.archived_at) return { error: "תבנית לשימוש חד-פעמי זו כבר נוצלה ולא ניתן לשלוח אותה שוב" };
  const admin = createAdminClient();

  const recipientName = (formData.get("recipient_name") as string)?.trim();
  const recipientEmail = (formData.get("recipient_email") as string)?.trim().toLowerCase();
  const expiryDays = Math.min(
    Math.max(1, Number(formData.get("expiry_days")) || 14),
    90
  );

  if (!recipientName) return { error: "יש להזין שם לקוח" };
  if (recipientName.length > 200) return { error: "שם הלקוח ארוך מדי (עד 200 תווים)" };
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

  // ערכי מילוי-מקדים שהמנהל הזין (prefill_<fieldId>) — נשמרים כבר עכשיו,
  // כך שהלקוח יראה אותם ממולאים כשיפתח את הלינק.
  const { data: validFieldRows } = await admin
    .from("form_fields")
    .select("id")
    .eq("form_id", formId);
  const validFieldIds = new Set((validFieldRows ?? []).map((r) => r.id));

  const prefillRows: { submission_id: string; field_id: string; value: string }[] = [];
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("prefill_")) continue;
    const fieldId = key.slice("prefill_".length);
    if (!validFieldIds.has(fieldId)) continue; // דחה field_id שלא שייך לטופס זה
    const value = (raw as string)?.trim();
    if (!value) continue;
    prefillRows.push({
      submission_id: submission.id,
      field_id: fieldId,
      value: value.slice(0, 2000),
    });
  }
  if (prefillRows.length > 0) {
    await admin.from("submission_values").insert(prefillRows);
  }

  const { appUrl } = serverEnv();
  const link = `${appUrl}/fill/${token}`;

  const emailResult = await sendFormLinkEmail({
    to: recipientEmail,
    recipientName,
    formName: form.name,
    link,
  });

  revalidatePath("/submissions");
  revalidatePath("/dashboard");
  return { link, emailSent: emailResult.sent, emailError: emailResult.error, submissionId: submission.id };
}


export type FormActionState = { error?: string };

// תואם ל-useActionState. מחזיר שגיאות; בהצלחה מפנה לעורך.
export async function createForm(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const { profile } = await requireProfile();
  assertCanEdit(profile.role);

  const name = (formData.get("name") as string)?.trim();
  const file = formData.get("file") as File | null;
  const isReusable = formData.get("usage_type") !== "single_use";

  if (!name) return { error: "יש להזין שם לטופס" };
  if (!file || file.size === 0) return { error: "יש לבחור קובץ PDF" };
  if (file.size > MAX_PDF_BYTES) return { error: "הקובץ גדול מדי (מקסימום 20 MB)" };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "הקובץ חייב להיות PDF" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // בדיקת magic bytes של PDF (%PDF) — מונע זיוף MIME
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    return { error: "הקובץ אינו PDF תקני" };
  }

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
    is_reusable: isReusable,
    created_by: profile.id,
  });
  if (insertError) {
    // ניקוי הקובץ שהועלה אם רשומת ה-DB נכשלה
    await admin.storage.from("originals").remove([path]);
    return { error: "שמירת הטופס נכשלה: " + insertError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/templates");
  redirect(`/forms/${formId}/edit`);
}

export async function deleteForm(formId: string) {
  const { profile, supabase } = await requireProfile();
  assertCanEdit(profile.role);

  // RLS מוודא שהטופס שייך לארגון; קוראים קודם את הנתיב לניקוי האחסון.
  const { data: form } = await supabase
    .from("forms")
    .select("id, original_pdf_path, org_id")
    .eq("id", formId)
    .single();

  if (!form || form.org_id !== profile.org_id) throw new Error("טופס לא נמצא");

  const admin = createAdminClient();
  await admin.from("forms").delete().eq("id", formId).eq("org_id", profile.org_id);
  await admin.storage.from("originals").remove([form.original_pdf_path]);

  revalidatePath("/dashboard");
  revalidatePath("/templates");
}
