import { Suspense } from "react";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { AdminMain } from "@/components/AdminMain";
import { BrandLogo } from "@/components/BrandLogo";
import { signOut } from "@/app/(admin)/actions";

// מעטפת אזור הניהול: header קבוע + sidebar + אזור תוכן.
// headerCenter מאפשר לדפים ספציפיים (כמו עורך השדות) להציג באמצע ה-header
// תוכן אחר במקום תיבת החיפוש הגלובלית.
export async function AdminShell({
  children,
  headerCenter,
}: {
  children: React.ReactNode;
  headerCenter?: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  const userName = profile.full_name || "מנהל";
  const roleLabel = profile.role === "admin" ? "מנהל מערכת" : "חבר צוות";

  return (
    <div className="h-screen overflow-hidden">
      <header className="admin-header">
        <Link href="/dashboard" className="header-logo-link">
          <BrandLogo size="sm" />
        </Link>

        {headerCenter ?? (
          <div className="header-search">
            <SearchIcon />
            <input type="text" placeholder="חיפוש בטפסים, הגשות..." />
            <kbd className="header-search-kbd">⌘K</kbd>
          </div>
        )}

        <div className="header-user-area">
          <Link href="/submissions" className="header-icon-btn" aria-label="התראות על הגשות ממתינות">
            <BellIcon />
            <Suspense fallback={null}>
              <AlertBadge />
            </Suspense>
          </Link>
          <Link href="/settings" className="header-user">
            <span className="header-user-avatar">{userName[0]}</span>
            <span className="header-user-text">
              <span className="header-user-name">{userName}</span>
              <span className="header-user-role">{roleLabel}</span>
            </span>
          </Link>
        </div>
      </header>
      <Sidebar userName={userName} role={profile.role} signOutAction={signOut} />
      <div className="mr-[248px] h-screen overflow-hidden pt-[76px]">
        <AdminMain>{children}</AdminMain>
      </div>
    </div>
  );
}

// סופרת הגשות ממתינות, מוצגת בנפרד עם Suspense כדי שלא תחסום
// את רינדור שאר ה-shell (header/sidebar) בכל ניווט.
async function AlertBadge() {
  const { supabase } = await requireProfile();
  const { count } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "opened"]);

  if (!count) return null;
  return <span className="header-badge">{count > 9 ? "9+" : count}</span>;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 3.5c-2.9 0-5.2 2.3-5.2 5.2v2.6c0 .6-.2 1.2-.6 1.7L5 14.5c-.6.7-.1 1.8.8 1.8h12.4c.9 0 1.4-1.1.8-1.8l-1.2-1.5c-.4-.5-.6-1.1-.6-1.7V8.7c0-2.9-2.3-5.2-5.2-5.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
