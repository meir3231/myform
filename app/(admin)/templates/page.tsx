import { requireProfile } from "@/lib/auth";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const { supabase } = await requireProfile();

  const [{ data: forms }, { data: folders }] = await Promise.all([
    supabase
      .from("forms")
      .select("id, name, page_count, is_reusable, archived_at, folder_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("folders")
      .select("id, name, parent_id")
      .order("name"),
  ]);

  return (
    <TemplatesClient
      forms={forms ?? []}
      folders={folders ?? []}
    />
  );
}
