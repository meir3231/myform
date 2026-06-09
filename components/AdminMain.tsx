"use client";

import { usePathname } from "next/navigation";

// עמודי "עבודה עם ה-PDF" (יצירה/עריכה/שליחה) מוצגים על רקע paper העדין;
// שאר עמודי הניהול (דשבורד/הגשות/הגדרות) — על רקע surface הבהיר-סגלגל.
const PDF_PREFIXES = ["/forms"];

export function AdminMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPdfPage = PDF_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <main
      className={`flex-1 text-paper-text ${isPdfPage ? "bg-paper" : "bg-surface"}`}
      style={{ viewTransitionName: "main-content" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </div>
    </main>
  );
}
