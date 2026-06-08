import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-gold shadow-sm transition group-hover:bg-brand-dark">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3v18M12 3l-5 3-2 6h14l-2-6-5-3ZM5 12a3 3 0 0 0 6 0M13 12a3 3 0 0 0 6 0M5 21h14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-xl font-bold tracking-tight text-brand">
                MyForm
              </span>
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link
                href="/dashboard"
                className="group relative px-3 py-2 font-medium text-slate-600 transition hover:text-brand"
              >
                טפסים
                <span className="absolute inset-x-3 -bottom-[1px] h-0.5 origin-center scale-x-0 rounded-full bg-gold transition-transform duration-200 group-hover:scale-x-100" />
              </Link>
              <Link
                href="/submissions"
                className="group relative px-3 py-2 font-medium text-slate-600 transition hover:text-brand"
              >
                הגשות
                <span className="absolute inset-x-3 -bottom-[1px] h-0.5 origin-center scale-x-0 rounded-full bg-gold transition-transform duration-200 group-hover:scale-x-100" />
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {profile.full_name || "מנהל"}
            </span>
            <form action={signOut}>
              <button type="submit" className="btn-secondary !px-3 !py-1.5">
                התנתקות
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="page-fade-in">{children}</div>
      </main>
    </div>
  );
}
