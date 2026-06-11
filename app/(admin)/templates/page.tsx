import { requireProfile } from "@/lib/auth";
import { TemplatesClient } from "./templates-client";
import { getFormPreview } from "./actions";

export default async function TemplatesPage() {
  const { profile, supabase } = await requireProfile();

  const [{ data: forms }, { data: folders }, { data: profiles }, { data: fieldRows }] = await Promise.all([
    supabase
      .from("forms")
      .select("id, name, page_count, is_reusable, archived_at, folder_id, created_at, visibility, created_by")
      .order("created_at", { ascending: false }),
    supabase
      .from("folders")
      .select("id, name, parent_id")
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("org_id", profile.org_id),
    supabase
      .from("form_fields")
      .select("form_id"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const fieldCounts = new Map<string, number>();
  for (const row of fieldRows ?? []) {
    fieldCounts.set(row.form_id, (fieldCounts.get(row.form_id) ?? 0) + 1);
  }

  const normalizedForms = (forms ?? []).map((f) => ({
    ...f,
    visibility: f.visibility ?? "private",
    creatorName: f.created_by ? (profileMap.get(f.created_by) ?? null) : null,
    fieldCount: fieldCounts.get(f.id) ?? 0,
  }));

  const initialPreviewFormId = normalizedForms[0]?.id ?? null;
  const initialPreviewData = initialPreviewFormId
    ? await getFormPreview(initialPreviewFormId)
    : null;

  return (
    <TemplatesClient
      forms={normalizedForms}
      folders={folders ?? []}
      currentUserId={profile.id}
      currentUserRole={profile.role}
      initialPreviewFormId={initialPreviewFormId}
      initialPreviewData={initialPreviewData && !("error" in initialPreviewData) ? initialPreviewData : null}
    />
  );
}
