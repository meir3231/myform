import Image from "next/image";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { SiteFooter } from "@/components/SiteFooter";
import { Sidebar } from "@/components/Sidebar";
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
      <header className="admin-header">
        <Link href="/dashboard" className="header-logo-link">
          <Image src="/logo.png" alt="TofSync" width={774} height={336} className="h-auto" priority />
        </Link>
      </header>
      <Sidebar userName={profile.full_name || "מנהל"} role={profile.role} signOutAction={signOut} />
      <div className="mr-[220px] flex min-h-screen flex-col">
        <AdminMain>{children}</AdminMain>
        <SiteFooter />
      </div>
    </div>
  );
}
