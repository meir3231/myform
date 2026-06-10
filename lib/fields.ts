import type { FieldType } from "@/lib/database.types";

// תווית בעברית + צבע לכל סוג שדה, לשימוש בעורך ובדף המילוי.
export const FIELD_META: Record<
  FieldType,
  { label: string; color: string; defaultW: number; defaultH: number }
> = {
  text: { label: "טקסט", color: "#3b82f6", defaultW: 0.18, defaultH: 0.026 },
  number: { label: "מספר", color: "#8b5cf6", defaultW: 0.11, defaultH: 0.026 },
  date: { label: "תאריך", color: "#14b8a6", defaultW: 0.11, defaultH: 0.026 },
  signature: { label: "חתימה", color: "#ef4444", defaultW: 0.22, defaultH: 0.065 },
  initials: { label: "ראשי תיבות", color: "#f59e0b", defaultW: 0.09, defaultH: 0.045 },
  checkbox: { label: "תיבת סימון", color: "#6366f1", defaultW: 0.022, defaultH: 0.016 },
};

export const FIELD_TYPES = Object.keys(FIELD_META) as FieldType[];

// טיוטת שדה בעורך (לפני שמירה ל-DB). קואורדינטות מנורמלות 0..1.
export interface FieldDraft {
  id: string; // uuid מקומי או של DB
  page: number; // 1-based
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  label: string;
  required: boolean;
  font_size: number;
  // אם מוגדר — ערך השדה מועתק אוטומטית משדה "מקור" אחר באותו טופס בזמן המילוי
  // (למשל "שם" שחוזר על עצמו בכמה עמודים — הלקוח ממלא פעם אחת בלבד).
  copyFrom?: string | null;
}
