"use client";

import { usePathname } from "next/navigation";

// עמודי "עבודה עם ה-PDF" (יצירה/עריכה/שליחה) מוצגים בערכה הבהירה;
// שאר עמודי הניהול (דשבורד/הגשות/הגדרות) — בערכה הכהה.
const LIGHT_PREFIXES = ["/forms"];

export function AdminMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const light = LIGHT_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <main className={light ? "bg-paper text-paper-text" : "bg-ink text-ink-text"}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="page-fade-in">{children}</div>
      </div>
    </main>
  );
}
