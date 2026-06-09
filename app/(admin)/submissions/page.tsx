import { requireProfile } from "@/lib/auth";
import { SubmissionsClient } from "./submissions-client";

export default async function SubmissionsPage() {
  const { supabase } = await requireProfile();

  const [{ data: submissions }, { data: forms }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, recipient_name, recipient_email, status, sent_at, completed_at, form_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("forms")
      .select("id, name")
      .order("name"),
  ]);

  const formName = new Map((forms ?? []).map((f) => [f.id, f.name]));
  const formOptions = forms ?? [];

  return (
    <SubmissionsClient
      submissions={submissions ?? []}
      formName={formName}
      formOptions={formOptions}
    />
  );
}
