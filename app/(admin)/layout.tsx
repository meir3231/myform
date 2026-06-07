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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-brand">
              MyForm
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-slate-600 hover:text-brand">
                טפסים
              </Link>
              <Link href="/submissions" className="text-slate-600 hover:text-brand">
                הגשות
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{profile.full_name || "מנהל"}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                התנתקות
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
