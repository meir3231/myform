"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface Crumb {
  label: string;
  href?: string;
}

// מזריק (portal) breadcrumb אופציונלי + כותרת העמוד לתוך ה-header
// (לתוך #header-page-title ב-AdminShell), במקום להציגם בראש תוכן העמוד.
export function PageHeading({ crumbs, title }: { crumbs?: Crumb[]; title: string }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById("header-page-title"));
  }, []);

  if (!slot) return null;

  return createPortal(
    <div className="page-heading-block">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="ניווט" className="page-heading-breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="page-heading-crumb">
              {i > 0 && <span className="page-heading-sep">‹</span>}
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <h1 className="page-heading-title">{title}</h1>
    </div>,
    slot
  );
}
