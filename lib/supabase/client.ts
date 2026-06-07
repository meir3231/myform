"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { PUBLIC_ENV } from "@/lib/env";

// לקוח Supabase לדפדפן (משתמש ב-anon key). לשימוש המנהל המחובר בלבד.
export function createClient() {
  return createBrowserClient<Database>(
    PUBLIC_ENV.supabaseUrl,
    PUBLIC_ENV.supabaseAnonKey
  );
}
