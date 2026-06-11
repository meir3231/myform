import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, compact }: { items: Crumb[]; compact?: boolean }) {
  return (
    <nav aria-label="ניווט" className={`flex flex-wrap items-center gap-1.5 text-sm ${compact ? "mb-1" : "mb-3"}`}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">‹</span>}
          {item.href ? (
            <Link href={item.href} className="text-slate-400 transition hover:text-brand">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-600">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
