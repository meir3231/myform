"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type MobileNavContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

// עוטף את ה-shell כדי לנהל מצב פתיחה/סגירה של הסיידבר כ-Drawer מתחת ל-991px
// (סעיף 18). נסגר אוטומטית בכל ניווט, ונועל גלילת body כשהוא פתוח.
export function MobileNavProvider({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <MobileNavContext.Provider value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}>
      <div className={`${className ?? ""} ${open ? "mobile-nav-open" : ""}`}>{children}</div>
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}

export function MobileNavToggle() {
  const { toggle } = useMobileNav();
  return (
    <button onClick={toggle} className="mobile-nav-toggle" aria-label="פתיחת ניווט">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function MobileNavBackdrop() {
  const { open, close } = useMobileNav();
  if (!open) return null;
  return <div className="mobile-nav-backdrop" onClick={close} />;
}
