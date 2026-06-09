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
          <Image src="/logo.png" alt="TofSync" width={138} height={60} className="h-auto" priority />
        </Link>
        <div aria-hidden="true" className="header-wave">
          <svg viewBox="0 0 1440 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,14 C180,28 360,0 540,14 C720,28 900,0 1080,14 C1260,28 1380,20 1440,16 L1440,28 L0,28 Z" fill="#f4f5f7"/>
          </svg>
        </div>
      </header>
      <Sidebar userName={profile.full_name || "מנהל"} signOutAction={signOut} />
      <div className="mr-[220px] flex min-h-screen flex-col">
        <AdminMain>{children}</AdminMain>
        <SiteFooter />
      </div>
    </div>
  );
}
