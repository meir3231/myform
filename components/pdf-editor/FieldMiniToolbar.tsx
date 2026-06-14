"use client";

import { AlignCenterIcon, DuplicateIcon, TrashIcon } from "./icons";

// סרגל כלים צף מעל שדה נבחר על המסמך: שכפול, מרכוז בעמוד, מחיקה.
// ממוקם מעל הפינה העליונה-ימנית של תיבת השדה (קואורדינטות בפיקסלים).
export function FieldMiniToolbar({
  left,
  top,
  onDuplicate,
  onAlignCenter,
  onDelete,
}: {
  left: number;
  top: number;
  onDuplicate: () => void;
  onAlignCenter: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="field-mini-toolbar"
      style={{ left, top: Math.max(top - 38, 0) }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={onDuplicate} title="שכפול שדה" aria-label="שכפול שדה">
        <DuplicateIcon />
      </button>
      <button type="button" onClick={onAlignCenter} title="מרכוז בעמוד" aria-label="מרכוז בעמוד">
        <AlignCenterIcon />
      </button>
      <span className="field-mini-toolbar-sep" />
      <button type="button" onClick={onDelete} title="מחיקת שדה" aria-label="מחיקת שדה" className="is-danger">
        <TrashIcon />
      </button>
    </div>
  );
}
