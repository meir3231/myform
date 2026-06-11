"use client";

import { usePathname } from "next/navigation";

// בעמוד עריכת טופס אנו מפנים את עמודת המרכז של ה-header לכפתורי הפעולה
// (שמירה / תצוגה מקדימה / שמירה ושליחה) שמוזרקים אליה דרך portal מתוך FieldEditor.
// בכל שאר המסכים נשארת תיבת החיפוש הגלובלית.
export function HeaderActionSlot() {
  const pathname = usePathname();
  const isFormEditor = /^\/forms\/[^/]+\/edit/.test(pathname);

  if (isFormEditor) {
    return <div id="header-editor-actions" className="header-editor-actions" />;
  }

  return (
    <div className="header-search">
      <SearchIcon />
      <input type="text" placeholder="חיפוש בטפסים, הגשות..." />
      <kbd className="header-search-kbd">⌘K</kbd>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
