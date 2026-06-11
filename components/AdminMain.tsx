"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Crumb = { label: string; href?: string };

// breadcrumb למסכים פנימיים, נגזר מנתיב ה-URL
function getBreadcrumb(pathname: string): Crumb[] | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] === "dashboard") return null;

  switch (segments[0]) {
    case "templates":
      return [{ label: "תבניות" }];
    case "submissions":
      return segments.length > 1
        ? [{ label: "הגשות", href: "/submissions" }, { label: "פרטי הגשה" }]
        : [{ label: "הגשות" }];
    case "settings":
      return segments[1] === "users"
        ? [{ label: "הגדרות", href: "/settings" }, { label: "ניהול משתמשים" }]
        : [{ label: "הגדרות" }];
    case "forms":
      return [
        { label: "תבניות", href: "/templates" },
        { label: segments[2] === "send" ? "שליחת טופס" : "עריכת טופס" },
      ];
    default:
      return null;
  }
}

export function AdminMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname);

  const isDashboard = pathname === "/dashboard";
  // עורך השדות זקוק לרוחב גדול יותר מ-max-w-6xl כדי להציג את 3 פאנלי
  // העריכה (פאלטה / מסמך / מאפיינים) לפי מידות מסמך העיצוב v2 (סעיף 11.1).
  const isFormEditor = /^\/forms\/[^/]+\/edit/.test(pathname);

  return (
    <main
      className="h-full overflow-y-auto bg-background text-navy"
      style={{ viewTransitionName: "main-content" }}
    >
      <div
        className={`mx-auto h-full px-8 lg:px-10 ${isFormEditor ? "py-4" : "py-8"} ${
          isDashboard || isFormEditor ? "" : "max-w-6xl"
        }`}
      >
        {breadcrumb && !isFormEditor && (
          <nav className="mb-3 flex items-center gap-1.5 text-sm text-text-secondary">
            <Link href="/dashboard" className="transition hover:text-brand">
              לוח בקרה
            </Link>
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-paper-line">/</span>
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-brand">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-navy">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {children}
      </div>
    </main>
  );
}
