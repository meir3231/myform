"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRole, type Role } from "@/lib/permissions";

async function assertAdmin() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}

export async function createUser(formData: FormData): Promise<{ error?: string }> {
  const callerProfile = await assertAdmin();

  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string);
  const roleInput = formData.get("role") as string;
  const role: Role = isRole(roleInput) ? roleInput : "viewer";

  if (!fullName) return { error: "יש להזין שם מלא" };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "כתובת אימייל לא תקינה" };
  if (!password || password.length < 6) return { error: "סיסמה חייבת להכיל לפחות 6 תווים" };

  const admin = createAdminClient();

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authErr || !authData.user) {
    return { error: authErr?.message ?? "יצירת המשתמש נכשלה" };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: authData.user.id,
    org_id: callerProfile.org_id,
    full_name: fullName,
    role,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "יצירת הפרופיל נכשלה: " + profileErr.message };
  }

  revalidatePath("/settings/users");
  return {};
}

export async function changeRole(
  userId: string,
  newRole: Role
): Promise<{ error?: string }> {
  const callerProfile = await assertAdmin();
  if (callerProfile.id === userId) return { error: "לא ניתן לשנות את התפקיד של עצמך" };
  if (!isRole(newRole)) return { error: "תפקיד לא תקין" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)
    .eq("org_id", callerProfile.org_id);

  if (error) return { error: "עדכון התפקיד נכשל: " + error.message };

  revalidatePath("/settings/users");
  return {};
}

export async function removeUser(userId: string): Promise<{ error?: string }> {
  const callerProfile = await assertAdmin();
  if (callerProfile.id === userId) return { error: "לא ניתן למחוק את עצמך" };

  const admin = createAdminClient();

  // ודא שהמשתמש שייך לאותה ארגון
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .eq("org_id", callerProfile.org_id)
    .single();

  if (!targetProfile) return { error: "משתמש לא נמצא" };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "מחיקת המשתמש נכשלה: " + error.message };

  revalidatePath("/settings/users");
  return {};
}
