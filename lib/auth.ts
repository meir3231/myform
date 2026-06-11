import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// פרופיל המנהל המחובר + org_id. מפנה ל-login אם לא מחובר/חסר פרופיל.
// עטוף ב-cache(): גם ה-layout וגם כל דף קוראים לפונקציה הזו. בלי memoization
// כל קריאה ביצעה round-trip נפרד לשרת ה-Auth (לא רק פענוח JWT מקומי!) +
// שאילתת DB לפרופיל — מה שהכפיל את זמן התגובה של כל ניווט/פעולה.
// cache() מבטיח שתוך אותה בקשה זה ירוץ פעם אחת בלבד.
//
// משתמשים ב-getSession() ולא ב-getUser(): ה-middleware כבר ביצע getUser()
// (round-trip אמיתי לשרת ה-Auth) ואימת/רענן את הסשן עבור הבקשה הזו, אז
// קריאה נוספת ל-getUser() כאן הייתה round-trip שני מיותר על כל ניווט.
// getSession() קוראת את הסשן המאומת מתוך ה-cookie ללא רשת.
export const requireProfile = cache(async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { user, profile, supabase };
});
