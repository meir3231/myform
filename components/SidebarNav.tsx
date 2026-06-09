"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "דשבורד", icon: DashboardIcon },
  { href: "/templates", label: "תבניות", icon: TemplatesIcon },
  { href: "/submissions", label: "הגשות", icon: SubmissionsIcon },
  { href: "/settings", label: "הגדרות", icon: SettingsIcon },
];

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();

  const items = [
    ...NAV_ITEMS,
    ...(role === "admin"
      ? [{ href: "/settings/users", label: "ניהול משתמשים", icon: UsersIcon }]
      : []),
  ];

  return (
    <nav className="flex-1 space-y-1 p-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-teal-50 text-teal-700 border-r-[3px] border-teal-500"
                : "text-slate-600 hover:bg-teal-50/60 hover:text-teal-700"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="10" width="7.5" height="10.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function TemplatesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="4" width="7" height="4.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="11.5" width="7" height="8.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="13.5" width="7" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SubmissionsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 7.5 12 13l9-5.5M4.5 6h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 13.5a7.97 7.97 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5a8 8 0 0 0-2.6 1.5l-2.3-.9-2 3.4L4.6 10.5a7.97 7.97 0 0 0 0 3L2.7 15.5l2 3.4 2.3-.9a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.3.9 2-3.4-1.9-1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c0-4 2.7-6 6-6s6 2 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M21 20c0-3-1.8-4.5-4-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
