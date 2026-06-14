import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { SubmissionsClient } from "./submissions-client";

export default async function SubmissionsPage() {
  const { profile, supabase } = await requireProfile();

  const submissionsQuery = supabase
    .from("submissions")
    .select("id, recipient_name, recipient_email, status, sent_at, opened_at, completed_at, created_at, expires_at, form_id, created_by")
    .order("created_at", { ascending: false });

  const formsQuery = supabase
    .from("forms")
    .select("id, name, folder_id")
    .order("name");

  const foldersQuery = supabase
    .from("folders")
    .select("id, name")
    .order("name");

  const profilesQuery = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("org_id", profile.org_id);

  const [{ data: submissions }, { data: forms }, { data: folders }, { data: profiles }] = await Promise.all([
    submissionsQuery,
    formsQuery,
    foldersQuery,
    profilesQuery,
  ]);

  const formName = new Map((forms ?? []).map((f) => [f.id, f.name]));
  const formFolder = new Map((forms ?? []).map((f) => [f.id, f.folder_id]));
  const folderName = new Map((folders ?? []).map((f) => [f.id, f.name]));
  const userName = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]));
  const folderOptions = folders ?? [];
  const userOptions = (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "—" }));

  return (
    <Suspense fallback={null}>
      <SubmissionsClient
        submissions={submissions ?? []}
        formName={formName}
        formFolder={formFolder}
        folderName={folderName}
        userName={userName}
        folderOptions={folderOptions}
        userOptions={userOptions}
        canEdit={canEdit(profile.role)}
      />
    </Suspense>
  );
}
