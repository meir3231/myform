"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadFile } from "@/lib/storage";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUUID(id: string, label = "מזהה") {
  if (!UUID_RE.test(id)) throw new Error(`${label} לא תקין`);
}

// ─── Folder actions ────────────────────────────────────────────────────────────

export async function createFolder(name: string): Promise<{ error?: string }> {
  const { profile } = await requireProfile();
  const admin = createAdminClient();
  const { error } = await admin.from("folders").insert({
    org_id: profile.org_id,
    name: name.slice(0, 100).trim(),
    created_by: profile.id,
  });
  if (error) return { error: "יצירת תיקייה נכשלה: " + error.message };
  revalidatePath("/templates");
  return {};
}

export async function renameFolder(id: string, name: string): Promise<void> {
  assertUUID(id, "תיקייה");
  const { profile } = await requireProfile();
  const admin = createAdminClient();
  await admin.from("folders")
    .update({ name: name.slice(0, 100).trim() })
    .eq("id", id)
    .eq("org_id", profile.org_id);
  revalidatePath("/templates");
}

export async function deleteFolder(id: string): Promise<void> {
  assertUUID(id, "תיקייה");
  const { profile } = await requireProfile();
  const admin = createAdminClient();
  // Move all forms in this folder to the root (no folder)
  await admin.from("forms")
    .update({ folder_id: null })
    .eq("folder_id", id)
    .eq("org_id", profile.org_id);
  await admin.from("folders")
    .delete()
    .eq("id", id)
    .eq("org_id", profile.org_id);
  revalidatePath("/templates");
}

// ─── Form actions ──────────────────────────────────────────────────────────────

export async function moveFormToFolder(
  formId: string,
  folderId: string | null
): Promise<void> {
  assertUUID(formId, "טופס");
  if (folderId !== null) assertUUID(folderId, "תיקייה");
  const { profile } = await requireProfile();
  const admin = createAdminClient();
  await admin.from("forms")
    .update({ folder_id: folderId })
    .eq("id", formId)
    .eq("org_id", profile.org_id);
  revalidatePath("/templates");
}

export async function duplicateForm(formId: string): Promise<void> {
  assertUUID(formId, "טופס");
  const { profile } = await requireProfile();
  const admin = createAdminClient();

  const { data: form } = await admin.from("forms")
    .select("id, org_id, name, original_pdf_path, page_count, is_reusable, folder_id")
    .eq("id", formId)
    .eq("org_id", profile.org_id)
    .single();
  if (!form) throw new Error("טופס לא נמצא");

  const { data: fields } = await admin.from("form_fields")
    .select("page, x, y, width, height, type, label, required, font_size, sort_order")
    .eq("form_id", formId)
    .order("sort_order");

  const pdfBytes = await downloadFile("originals", form.original_pdf_path);

  const newFormId = randomUUID();
  const newPath = `${profile.org_id}/${newFormId}/original.pdf`;

  const { error: uploadErr } = await admin.storage
    .from("originals")
    .upload(newPath, pdfBytes, { contentType: "application/pdf" });
  if (uploadErr) throw new Error("העלאת עותק ה-PDF נכשלה");

  const { error: insertErr } = await admin.from("forms").insert({
    id: newFormId,
    org_id: form.org_id,
    name: `${form.name} (עותק)`,
    original_pdf_path: newPath,
    page_count: form.page_count,
    is_reusable: form.is_reusable,
    folder_id: form.folder_id,
    created_by: profile.id,
  });
  if (insertErr) throw new Error("יצירת עותק הטופס נכשלה");

  if (fields && fields.length > 0) {
    await admin.from("form_fields").insert(
      fields.map((f) => ({
        id: randomUUID(),
        form_id: newFormId,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        type: f.type,
        label: f.label,
        required: f.required,
        font_size: f.font_size,
        sort_order: f.sort_order,
      }))
    );
  }

  revalidatePath("/templates");
  revalidatePath("/dashboard");
}

export async function renameForm(formId: string, name: string): Promise<void> {
  assertUUID(formId, "טופס");
  if (!name.trim()) return;
  const { profile } = await requireProfile();
  const admin = createAdminClient();
  await admin.from("forms")
    .update({ name: name.slice(0, 200).trim() })
    .eq("id", formId)
    .eq("org_id", profile.org_id);
  revalidatePath("/templates");
  revalidatePath("/dashboard");
}

// ─── Merge action ──────────────────────────────────────────────────────────────

export async function mergeForms(
  sourceFormIds: string[],
  name: string,
  isReusable: boolean,
  folderId?: string
): Promise<{ ok: boolean; formId?: string; error?: string }> {
  if (!Array.isArray(sourceFormIds) || sourceFormIds.length < 2) {
    return { ok: false, error: "יש לבחור לפחות 2 טפסים למיזוג" };
  }
  if (sourceFormIds.length > 10) {
    return { ok: false, error: "ניתן למזג עד 10 טפסים בבת-אחת" };
  }
  for (const id of sourceFormIds) {
    if (!UUID_RE.test(id)) return { ok: false, error: "מזהה טופס לא תקין" };
  }
  if (!name.trim()) return { ok: false, error: "נא להזין שם לטופס הממוזג" };

  const { profile } = await requireProfile();
  const admin = createAdminClient();

  type SourceEntry = {
    pdfBytes: Uint8Array;
    pageCount: number;
    fields: Array<{
      page: number; x: number; y: number; width: number; height: number;
      type: string; label: string; required: boolean; font_size: number; sort_order: number;
    }>;
    pageOffset: number;
  };

  const sources: SourceEntry[] = [];
  let pageOffset = 0;

  for (const formId of sourceFormIds) {
    const { data: form } = await admin.from("forms")
      .select("id, org_id, original_pdf_path, page_count")
      .eq("id", formId)
      .eq("org_id", profile.org_id)
      .single();
    if (!form) return { ok: false, error: "אחד הטפסים לא נמצא" };

    const { data: fields } = await admin.from("form_fields")
      .select("page, x, y, width, height, type, label, required, font_size, sort_order")
      .eq("form_id", formId)
      .order("sort_order");

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await downloadFile("originals", form.original_pdf_path);
    } catch {
      return { ok: false, error: `לא ניתן להוריד את הטופס: ${formId}` };
    }

    sources.push({ pdfBytes, pageCount: form.page_count, fields: fields ?? [], pageOffset });
    pageOffset += form.page_count;
  }

  // Merge PDFs with pdf-lib
  const { PDFDocument } = await import("pdf-lib");
  const mergedPdf = await PDFDocument.create();

  for (const { pdfBytes } of sources) {
    try {
      const src = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const copied = await mergedPdf.copyPages(src, src.getPageIndices());
      copied.forEach((p) => mergedPdf.addPage(p));
    } catch {
      return { ok: false, error: "אחד הטפסים מוגן בסיסמה או פגום — לא ניתן למזג" };
    }
  }

  const mergedBytes = await mergedPdf.save();
  const totalPages = mergedPdf.getPageCount();

  const newFormId = randomUUID();
  const newPath = `${profile.org_id}/${newFormId}/original.pdf`;

  const { error: uploadErr } = await admin.storage
    .from("originals")
    .upload(newPath, mergedBytes, { contentType: "application/pdf" });
  if (uploadErr) return { ok: false, error: "שגיאה בהעלאת ה-PDF הממוזג" };

  const { error: insertErr } = await admin.from("forms").insert({
    id: newFormId,
    org_id: profile.org_id,
    name: name.slice(0, 200).trim(),
    original_pdf_path: newPath,
    page_count: totalPages,
    is_reusable: isReusable,
    folder_id: folderId ?? null,
    created_by: profile.id,
  });
  if (insertErr) return { ok: false, error: "שגיאה ביצירת רשומת הטופס הממוזג" };

  // Copy fields with adjusted page numbers
  const allFields = sources.flatMap(({ fields, pageOffset: off }) =>
    fields.map((f) => ({
      id: randomUUID(),
      form_id: newFormId,
      page: f.page + off,
      x: f.x, y: f.y, width: f.width, height: f.height,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: f.type as any,
      label: f.label, required: f.required,
      font_size: f.font_size, sort_order: f.sort_order,
    }))
  );

  if (allFields.length > 0) {
    await admin.from("form_fields").insert(allFields);
  }

  revalidatePath("/templates");
  revalidatePath("/dashboard");

  return { ok: true, formId: newFormId };
}

// ─── Visibility actions (admin only) ───────────────────────────────────────────

export async function shareForm(formId: string): Promise<{ error?: string }> {
  assertUUID(formId, "טופס");
  const { profile } = await requireProfile();
  if (profile.role !== "admin") return { error: "רק מנהל יכול לשתף טפסים" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("forms")
    .update({ visibility: "shared" })
    .eq("id", formId)
    .eq("org_id", profile.org_id);
  if (error) return { error: "שיתוף הטופס נכשל: " + error.message };
  revalidatePath("/templates");
  return {};
}

export async function unshareForm(formId: string): Promise<{ error?: string }> {
  assertUUID(formId, "טופס");
  const { profile } = await requireProfile();
  if (profile.role !== "admin") return { error: "רק מנהל יכול לשנות חשיפה" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("forms")
    .update({ visibility: "private" })
    .eq("id", formId)
    .eq("org_id", profile.org_id);
  if (error) return { error: "עדכון הטופס נכשל: " + error.message };
  revalidatePath("/templates");
  return {};
}
