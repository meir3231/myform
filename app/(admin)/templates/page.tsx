import { requireProfile } from "@/lib/auth";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const { profile, supabase } = await requireProfile();

  const [{ data: forms }, { data: folders }, { data: profiles }] = await Promise.all([
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
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const normalizedForms = (forms ?? []).map((f) => ({
    ...f,
    visibility: f.visibility ?? "private",
    creatorName: f.created_by ? (profileMap.get(f.created_by) ?? null) : null,
  }));

  return (
    <TemplatesClient
      forms={normalizedForms}
      folders={folders ?? []}
      currentUserId={profile.id}
      currentUserRole={profile.role}
    />
  );
}
