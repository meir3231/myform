// סקריפט הקמה ראשונית: יוצר ארגון, משתמש מנהל ראשון, ופרופיל מקושר.
// הרצה (אחרי הגדרת .env.local והרצת המיגרציה):
//   node scripts/setup.mjs "שם המשרד" admin@example.com "סיסמה-חזקה" "שם מלא"
//
// משתמש ב-service role key, לכן יש להריץ מקומית בלבד.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// טעינה ידנית של .env.local (ללא תלות חיצונית)
try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
} catch {
  console.error("לא נמצא .env.local — צור אותו לפי .env.example");
  process.exit(1);
}

const [, , orgName, email, password, fullName] = process.argv;
if (!orgName || !email || !password) {
  console.error(
    'שימוש: node scripts/setup.mjs "שם המשרד" admin@example.com "סיסמה" "שם מלא"'
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("חסר NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY ב-.env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1) ארגון
const { data: org, error: orgErr } = await supabase
  .from("organizations")
  .insert({ name: orgName })
  .select()
  .single();
if (orgErr) {
  console.error("שגיאה ביצירת ארגון:", orgErr.message);
  process.exit(1);
}
console.log("✓ ארגון נוצר:", org.id);

// 2) משתמש auth (מאומת מראש)
const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (userErr) {
  console.error("שגיאה ביצירת משתמש:", userErr.message);
  process.exit(1);
}
console.log("✓ משתמש נוצר:", userData.user.id);

// 3) פרופיל
const { error: profErr } = await supabase.from("profiles").insert({
  id: userData.user.id,
  org_id: org.id,
  full_name: fullName || null,
  role: "admin",
});
if (profErr) {
  console.error("שגיאה ביצירת פרופיל:", profErr.message);
  process.exit(1);
}

console.log("\n✅ ההקמה הושלמה. אפשר להתחבר עם:");
console.log("   אימייל:", email);
console.log("   סיסמה: (זו שהזנת)");
