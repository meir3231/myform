import { SidebarNav } from "./SidebarNav";

export function Sidebar({
  userName,
  signOutAction,
}: {
  userName: string;
  signOutAction: () => Promise<void>;
}) {
  return (
    <aside className="admin-shell-surface fixed inset-y-0 right-0 z-40 flex w-[220px] flex-col text-slate-700">
      <SidebarNav />

      <div className="border-t border-slate-200 p-3">
        <p className="truncate px-3 pb-2 text-sm font-medium text-slate-500">{userName}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
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
