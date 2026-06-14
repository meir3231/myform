"use client";

import { usePathname } from "next/navigation";

export function AdminMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";
  // עורך השדות זקוק לרוחב גדול יותר מ-max-w-6xl כדי להציג את 3 פאנלי
  // העריכה (פאלטה / מסמך / מאפיינים) לפי מידות מסמך העיצוב v2 (סעיף 11.1).
  const isFormEditor = /^\/forms\/[^/]+\/edit/.test(pathname);
  // מסך התבניות זקוק לגובה מקסימלי לרשימה/תצוגה המקדימה, עם פחות "אוויר" בראש העמוד.
  const isTemplatesPage = pathname === "/templates";
  // מסך מעקב שליחות זקוק לגובה מקסימלי לטבלה, באותו אופן כמו מסך התבניות.
  const isTrackingPage = pathname === "/tracking";

  return (
    <main
      className="h-full overflow-y-auto bg-background text-navy"
      style={{ viewTransitionName: "main-content" }}
    >
      <div
        className={`mx-auto h-full px-4 sm:px-8 lg:px-10 ${
          isTrackingPage ? "py-3" : isFormEditor || isTemplatesPage ? "py-4" : "py-8"
        } ${isDashboard || isFormEditor || isTrackingPage ? "" : "max-w-6xl"}`}
      >
        {children}
      </div>
    </main>
  );
}
