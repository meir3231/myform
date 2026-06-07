import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { PUBLIC_ENV } from "@/lib/env";

// לקוח Supabase לצד שרת (Server Components / Server Actions / Route Handlers).
// מחובר לסשן המנהל דרך cookies, וכפוף ל-RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    PUBLIC_ENV.supabaseUrl,
    PUBLIC_ENV.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // נקרא מתוך Server Component — ההגדרה תטופל ב-middleware.
          }
        },
      },
    }
  );
}
