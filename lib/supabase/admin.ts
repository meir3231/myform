import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverEnv } from "@/lib/env";

// לקוח Supabase עם service role — עוקף RLS. שרת בלבד!
// משמש לזרימת הלקוח הציבורית (מילוי טופס לפי token) ולפעולות מערכת
// כמו הפקת PDF, אחרי שאומת ה-token בנפרד.
export function createAdminClient() {
  const env = serverEnv();
  return createSupabaseClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
