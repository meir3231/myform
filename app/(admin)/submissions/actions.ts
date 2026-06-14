"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { assertCanEdit } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendFormLinkEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { getSignedUrl } from "@/lib/storage";

const EXPIRY_DAYS = 14;

// מאמת שההגשה שייכת לארגון של המנהל המחובר. מחזיר את ההגשה + שם הטופס.
async function assertSubmissionOwnership(submissionId: string) {
  const { profile, supabase } = await requireProfile();
  const { data: sub } = await supabase
    .from("submissions")
    .select("id, org_id, form_id, status, recipient_name, recipient_email")
    .eq("id", submissionId)
    .single();
  if (!sub || sub.org_id !== profile.org_id) throw new Error("הגשה לא נמצאה");
  const { data: form } = await supabase.from("forms").select("name").eq("id", sub.form_id).single();
  return { sub, formName: form?.name ?? "טופס" };
}

// מחדש את הלינק (טוקן חדש + הארכת תוקף) ושולח מייל תזכורת ללקוח.
export async function resendSubmissionLink(submissionId: string): Promise<{ link?: string; emailSent?: boolean; error?: string }> {
  const { profile } = await requireProfile();
  assertCanEdit(profile.role);
  const { sub, formName } = await assertSubmissionOwnership(submissionId);
  if (sub.status === "completed") return { error: "ההגשה הושלמה - לא ניתן לשלוח תזכורת" };

  const admin = createAdminClient();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const update: { token_hash: string; expires_at: string; status?: "pending"; sent_at: string } = {
    token_hash: tokenHash,
    expires_at: expiresAt,
    sent_at: new Date().toISOString(),
  };
  if (sub.status === "expired") update.status = "pending";

  const { error: updErr } = await admin.from("submissions").update(update).eq("id", submissionId);
  if (updErr) return { error: "עדכון ההגשה נכשל: " + updErr.message };

  const { appUrl } = serverEnv();
  const link = `${appUrl}/fill/${token}`;

  const emailResult = await sendFormLinkEmail({
    to: sub.recipient_email,
    recipientName: sub.recipient_name,
    formName,
    link,
  });

  revalidatePath("/submissions");
  return { link, emailSent: emailResult.sent, error: emailResult.sent ? undefined : emailResult.error };
}

// מחדש את הלינק (ללא שליחת מייל) - לצפייה כמו שהלקוח רואה.
export async function getSubmissionPreviewLink(submissionId: string): Promise<{ link?: string; error?: string }> {
  const { sub } = await assertSubmissionOwnership(submissionId);
  if (sub.status === "completed") return { error: "ההגשה הושלמה - אין לינק פעיל לצפייה" };

  const admin = createAdminClient();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const update: { token_hash: string; expires_at: string; status?: "pending" } = {
    token_hash: tokenHash,
    expires_at: expiresAt,
  };
  if (sub.status === "expired") update.status = "pending";

  const { error: updErr } = await admin.from("submissions").update(update).eq("id", submissionId);
  if (updErr) return { error: "עדכון ההגשה נכשל: " + updErr.message };

  const { appUrl } = serverEnv();
  revalidatePath("/submissions");
  return { link: `${appUrl}/fill/${token}` };
}

// מפיק קישור הורדה זמני ל-PDF החתום של הגשה שהושלמה.
export async function getCompletedPdfUrl(submissionId: string): Promise<{ url?: string; error?: string }> {
  const { profile, supabase } = await requireProfile();
  const { data: sub } = await supabase
    .from("submissions")
    .select("org_id, status, completed_pdf_path")
    .eq("id", submissionId)
    .single();
  if (!sub || sub.org_id !== profile.org_id) return { error: "הגשה לא נמצאה" };
  if (sub.status !== "completed" || !sub.completed_pdf_path) return { error: "אין PDF חתום להגשה זו" };

  const url = await getSignedUrl("completed", sub.completed_pdf_path, 60 * 10);
  return { url };
}

// מבטל את הלינק הקיים (פג תוקף מיידי).
export async function expireSubmissionLink(submissionId: string): Promise<{ error?: string }> {
  const { profile } = await requireProfile();
  assertCanEdit(profile.role);
  const { sub } = await assertSubmissionOwnership(submissionId);
  if (sub.status === "completed") return { error: "ההגשה הושלמה - לא ניתן לבטל לינק" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("submissions")
    .update({ status: "expired", expires_at: new Date().toISOString() })
    .eq("id", submissionId);
  if (error) return { error: "ביטול הלינק נכשל: " + error.message };

  revalidatePath("/submissions");
  return {};
}
