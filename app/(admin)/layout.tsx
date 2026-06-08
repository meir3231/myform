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
      <Sidebar userName={profile.full_name || "מנהל"} signOutAction={signOut} />
      <div className="mr-[220px] flex min-h-screen flex-col">
        <header className="admin-header sticky top-0 z-30" />
        <AdminMain>{children}</AdminMain>
        <SiteFooter />
      </div>
    </div>
  );
}
