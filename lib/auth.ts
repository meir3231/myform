import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// פרופיל המנהל המחובר + org_id. מפנה ל-login אם לא מחובר/חסר פרופיל.
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { user, profile, supabase };
}
