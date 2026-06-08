import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, dark = false }: { items: Crumb[]; dark?: boolean }) {
  return (
    <nav aria-label="ניווט" className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className={dark ? "text-ink-line" : "text-slate-300"}>‹</span>}
          {item.href ? (
            <Link
              href={item.href}
              className={`transition hover:text-brand ${dark ? "text-ink-muted hover:text-brand-light" : "text-slate-400"}`}
            >
              {item.label}
            </Link>
          ) : (
            <span className={`font-medium ${dark ? "text-ink-text" : "text-slate-600"}`}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
