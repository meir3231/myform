import Image from "next/image";
import Link from "next/link";
import { SidebarNav } from "./SidebarNav";

export function Sidebar({
  userName,
  signOutAction,
}: {
  userName: string;
  signOutAction: () => Promise<void>;
}) {
  return (
    <aside className="admin-shell-surface fixed inset-y-0 right-0 z-40 flex w-[220px] flex-col border-l border-[#3d3158] text-ink-text">
      <div className="flex items-center justify-center border-b border-ink-line px-4 py-4">
        <Link href="/dashboard">
          <Image src="/logo.png" alt="TofSync" width={180} height={60} className="h-auto w-[180px]" priority />
        </Link>
      </div>

      <SidebarNav />

      <div className="border-t border-ink-line p-3">
        <p className="truncate px-3 pb-2 text-sm font-medium text-ink-muted">{userName}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-white/5 hover:text-ink-text"
          >
            <SignOutIcon className="h-5 w-5 shrink-0" />
            התנתקות
          </button>
        </form>
      </div>
    </aside>
  );
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h3M16 16l4-4-4-4M9.5 12H20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
