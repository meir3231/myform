import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { NavDrawer } from "@/components/NavDrawer";
import { AdminMain } from "@/components/AdminMain";
import { signOut } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-line bg-ink-panel/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="group">
            <BrandLogo size="lg" />
          </Link>
          <NavDrawer userName={profile.full_name || "מנהל"} signOutAction={signOut} />
        </div>
      </header>
      <AdminMain>{children}</AdminMain>
      <SiteFooter dark />
    </div>
  );
}
