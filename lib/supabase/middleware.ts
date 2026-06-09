import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { PUBLIC_ENV } from "@/lib/env";

// רענון סשן המנהל והגנה על מסלולי /admin.
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminArea =
    path.startsWith("/dashboard") ||
    path.startsWith("/forms") ||
    path.startsWith("/submissions") ||
    path.startsWith("/settings") ||
    path.startsWith("/templates");

  // מסלולים ציבוריים (כמו /fill/[token]) לא צריכים בדיקת סשן מנהל בכלל —
  // קריאת auth.getUser() היא round-trip רשת אמיתי לשרת ה-Auth של Supabase
  // (לא רק פענוח JWT מקומי), ולכן מדלגים עליה לגמרי כאן כדי לא להאט אותם.
  if (!isAdminArea && path !== "/login") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    PUBLIC_ENV.supabaseUrl,
    PUBLIC_ENV.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // לא מחובר ומנסה להיכנס לאזור המנהל → הפניה ל-login
  if (!user && isAdminArea) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // מחובר ונמצא ב-login → הפניה לדשבורד
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
