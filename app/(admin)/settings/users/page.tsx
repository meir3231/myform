import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();

  const [{ data: profiles }, { data: authData }, { data: formCounts }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("org_id", profile.org_id)
      .order("created_at"),
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin
      .from("forms")
      .select("created_by")
      .eq("org_id", profile.org_id),
  ]);

  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) {
    emailMap[u.id] = u.email ?? "";
  }

  const countMap: Record<string, number> = {};
  for (const f of formCounts ?? []) {
    if (f.created_by) countMap[f.created_by] = (countMap[f.created_by] ?? 0) + 1;
  }

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name ?? "",
    email: emailMap[p.id] ?? "",
    role: p.role,
    createdAt: p.created_at,
    formCount: countMap[p.id] ?? 0,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-paper-text">ניהול משתמשים</h1>
      <UsersClient users={users} currentUserId={profile.id} />
    </div>
  );
}
