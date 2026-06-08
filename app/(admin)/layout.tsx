import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";
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
            <Link href="/dashboard" className="group">
              <BrandLogo size="lg" />
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
      <SiteFooter />
    </div>
  );
}
