import { requireProfile } from "@/lib/auth";
import { SubmissionsClient } from "./submissions-client";

export default async function SubmissionsPage() {
  const { profile, supabase } = await requireProfile();

  // member רואה רק הגשות של הטפסים שלו
  const submissionsQuery = supabase
    .from("submissions")
    .select("id, recipient_name, recipient_email, status, sent_at, completed_at, form_id")
    .order("created_at", { ascending: false });

  const formsQuery = supabase
    .from("forms")
    .select("id, name")
    .order("name");

  const [{ data: submissions }, { data: forms }] = await Promise.all([
    submissionsQuery,
    formsQuery,
  ]);

  const formName = new Map((forms ?? []).map((f) => [f.id, f.name]));
  const formOptions = forms ?? [];

  return (
    <SubmissionsClient
      submissions={submissions ?? []}
      formName={formName}
      formOptions={formOptions}
      currentUserRole={profile.role}
    />
  );
}
