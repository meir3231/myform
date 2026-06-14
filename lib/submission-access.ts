import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";
import { hashToken } from "@/lib/tokens";
import type { FieldDraft } from "@/lib/fields";

type LoadResult =
  | {
      status: "ok";
      submissionId: string;
      formName: string;
      orgName: string;
      recipientName: string;
      pageCount: number;
      pdfUrl: string;
      fields: FieldDraft[];
      initialValues: Record<string, string>;
    }
  | { status: "completed" }
  | { status: "expired" }
  | { status: "notfound" };

// טוען שליחה לפי טוקן עבור דף המילוי. מאמת תוקף וסטטוס, ומסמן כ-"נפתח".
export async function loadSubmissionForFill(token: string): Promise<LoadResult> {
  const admin = createAdminClient();
  const tokenHash = hashToken(token);

  const { data: sub } = await admin
    .from("submissions")
    .select("id, form_id, status, expires_at, recipient_name")
    .eq("token_hash", tokenHash)
    .single();

  if (!sub) return { status: "notfound" };
  if (sub.status === "completed") return { status: "completed" };

  if (new Date(sub.expires_at).getTime() < Date.now()) {
    if (sub.status !== "expired") {
      await admin.from("submissions").update({ status: "expired" }).eq("id", sub.id);
    }
    return { status: "expired" };
  }

  const { data: form } = await admin
    .from("forms")
    .select("id, name, org_id, original_pdf_path, page_count")
    .eq("id", sub.form_id)
    .single();
  if (!form) return { status: "notfound" };

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", form.org_id)
    .single();

  const { data: fields } = await admin
    .from("form_fields")
    .select("*")
    .eq("form_id", sub.form_id)
    .order("sort_order", { ascending: true });

  // מסמנים כנפתח (רק אם היה ממתין)
  if (sub.status === "pending") {
    await admin
      .from("submissions")
      .update({ status: "opened", opened_at: new Date().toISOString() })
      .eq("id", sub.id);
  }

  const pdfUrl = await getSignedUrl("originals", form.original_pdf_path, 60 * 30);

  // ערכים שמולאו מראש ע"י המנהל (prefill) — נטענים כך שהלקוח יראה אותם ממולאים
  const { data: existingValues } = await admin
    .from("submission_values")
    .select("field_id, value")
    .eq("submission_id", sub.id);

  const initialValues: Record<string, string> = {};
  for (const row of existingValues ?? []) {
    if (row.field_id && row.value != null) initialValues[row.field_id] = row.value;
  }

  return {
    status: "ok",
    submissionId: sub.id,
    formName: form.name,
    orgName: org?.name ?? "",
    recipientName: sub.recipient_name ?? "",
    pageCount: form.page_count,
    pdfUrl,
    fields: (fields ?? []).map((f) => ({
      id: f.id,
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      type: f.type,
      label: f.label,
      required: f.required,
      font_size: f.font_size,
    })),
    initialValues,
  };
}
