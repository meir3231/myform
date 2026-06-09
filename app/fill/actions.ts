"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { downloadFile, getSignedUrl } from "@/lib/storage";
import { flattenPdf, type FlattenInput } from "@/lib/pdf/flatten";
import { sendCompletionNotice } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import type { FieldDraft } from "@/lib/fields";

export type SubmitState = { ok: boolean; error?: string; downloadUrl?: string };

interface SubmitPayload {
  values: Record<string, string>;
  signatures: Record<string, string>; // dataURL PNG
}

const MAX_SIGNATURE_BYTES = 3 * 1024 * 1024;
const MAX_VALUE_LEN = 2000;

function dataUrlToPng(dataUrl: string): Uint8Array | null {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buf = Buffer.from(m[1], "base64");
  if (buf.length === 0 || buf.length > MAX_SIGNATURE_BYTES) return null;
  return new Uint8Array(buf);
}

export async function submitForm(
  token: string,
  payload: SubmitPayload
): Promise<SubmitState> {
  const admin = createAdminClient();
  const tokenHash = hashToken(token);

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "id, form_id, org_id, recipient_name, recipient_email, status, expires_at, created_by"
    )
    .eq("token_hash", tokenHash)
    .single();

  if (!sub) return { ok: false, error: "קישור לא תקין" };
  if (sub.status === "completed") return { ok: false, error: "הטופס כבר הוגש" };
  if (new Date(sub.expires_at).getTime() < Date.now())
    return { ok: false, error: "הקישור פג תוקף" };

  const { data: form } = await admin
    .from("forms")
    .select("id, name, original_pdf_path, is_reusable")
    .eq("id", sub.form_id)
    .single();
  if (!form) return { ok: false, error: "הטופס לא נמצא" };

  const { data: dbFields } = await admin
    .from("form_fields")
    .select("*")
    .eq("form_id", sub.form_id)
    .order("sort_order", { ascending: true });
  const fields = dbFields ?? [];

  // ולידציית שדות חובה בצד שרת (לא סומכים על הלקוח)
  for (const f of fields) {
    if (!f.required) continue;
    if (f.type === "signature" || f.type === "initials") {
      if (!payload.signatures[f.id]) return { ok: false, error: "חסרה חתימה בשדה חובה" };
    } else if (f.type === "checkbox") {
      if (payload.values[f.id] !== "true") return { ok: false, error: "יש לסמן את תיבת הסימון החובה" };
    } else if (!(payload.values[f.id] ?? "").trim()) {
      return { ok: false, error: "חסר ערך בשדה חובה" };
    }
  }

  // בניית קלט להשטחה + רשומות ערכים. מתבססים על שדות ה-DB בלבד.
  // שדות טקסט מעובדים בו-זמנית; חתימות נאספות ומועלות במקביל לאחר מכן.
  type SigJob = { f: typeof fields[0]; draft: FieldDraft; png: Uint8Array; sigPath: string };
  const inputs: FlattenInput[] = [];
  const valueRows: { submission_id: string; field_id: string; value: string }[] = [];
  const sigJobs: SigJob[] = [];

  for (const f of fields) {
    const draft: FieldDraft = {
      id: f.id, page: f.page, x: f.x, y: f.y,
      width: f.width, height: f.height, type: f.type,
      label: f.label, required: f.required, font_size: f.font_size,
    };

    if (f.type === "signature" || f.type === "initials") {
      const dataUrl = payload.signatures[f.id];
      if (!dataUrl) continue;
      const png = dataUrlToPng(dataUrl);
      if (!png) return { ok: false, error: "פורמט חתימה לא תקין" };
      sigJobs.push({ f, draft, png, sigPath: `${sub.org_id}/${sub.id}/${f.id}.png` });
    } else {
      const v = (payload.values[f.id] ?? "").slice(0, MAX_VALUE_LEN);
      inputs.push({ field: draft, value: v });
      valueRows.push({ submission_id: sub.id, field_id: f.id, value: v });
    }
  }

  // העלאת כל החתימות במקביל
  const uploadResults = await Promise.all(
    sigJobs.map(({ png, sigPath }) =>
      admin.storage.from("signatures").upload(sigPath, png, { contentType: "image/png", upsert: true })
    )
  );
  for (const { error: upErr } of uploadResults) {
    if (upErr) return { ok: false, error: "שמירת החתימה נכשלה" };
  }
  let primarySignaturePath: string | null = null;
  for (const { f, draft, png, sigPath } of sigJobs) {
    inputs.push({ field: draft, signaturePng: png });
    valueRows.push({ submission_id: sub.id, field_id: f.id, value: sigPath });
    if (!primarySignaturePath) primarySignaturePath = sigPath;
  }

  // השטחת ה-PDF
  let completed: Uint8Array;
  try {
    const originalBytes = await downloadFile("originals", form.original_pdf_path);
    completed = await flattenPdf(originalBytes, inputs);
  } catch {
    return { ok: false, error: "יצירת ה-PDF החתום נכשלה" };
  }

  const completedPath = `${sub.org_id}/${sub.id}/completed.pdf`;
  const { error: pdfUpErr } = await admin.storage
    .from("completed")
    .upload(completedPath, completed, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (pdfUpErr) return { ok: false, error: "שמירת ה-PDF נכשלה" };

  const docHash = createHash("sha256").update(completed).digest("hex");

  // שמירת הערכים (החלפה מלאה) — delete ואז insert סריאלי כי insert תלוי ב-delete
  await admin.from("submission_values").delete().eq("submission_id", sub.id);
  if (valueRows.length > 0) {
    await admin.from("submission_values").insert(valueRows);
  }

  // תיעוד + עדכון סטטוס — שתי הכתיבות עצמאיות, מריצים במקביל
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = hdrs.get("user-agent") || null;
  await Promise.all([
    admin.from("signature_audit").insert({
      submission_id: sub.id,
      signer_ip: ip,
      user_agent: ua,
      doc_sha256: docHash,
      signature_image_path: primarySignaturePath,
    }),
    admin.from("submissions").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_pdf_path: completedPath,
    }).eq("id", sub.id),
  ]);

  // תבנית לשימוש חד-פעמי: מושבתת אוטומטית אחרי הגשה ראשונה (לא נמחקת —
  // כדי לשמר את ההגשה/החתימה/יומן-הביקורת המקושרים אליה ב-cascade)
  if (!form.is_reusable) {
    await admin
      .from("forms")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", form.id)
      .is("archived_at", null);
  }

  // התראת מנהל (best-effort)
  try {
    if (sub.created_by) {
      const { data: userRes } = await admin.auth.admin.getUserById(sub.created_by);
      const adminEmail = userRes?.user?.email;
      if (adminEmail) {
        const { appUrl } = serverEnv();
        await sendCompletionNotice({
          to: adminEmail,
          formName: form.name,
          recipientName: sub.recipient_name,
          reviewLink: `${appUrl}/submissions/${sub.id}`,
        });
      }
    }
  } catch {
    // לא קריטי — אל תיכשל בגלל המייל
  }

  // קישור הורדה + ריענון קאש — שתי הפעולות עצמאיות
  let downloadUrl: string | undefined;
  try {
    downloadUrl = await getSignedUrl("completed", completedPath, 60 * 30);
  } catch {
    // לא קריטי — הלקוח יכול לקבל את הקובץ דרך המנהל
  }

  revalidatePath("/dashboard");
  revalidatePath("/submissions");
  revalidatePath("/templates");

  return { ok: true, downloadUrl };
}
