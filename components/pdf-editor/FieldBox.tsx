"use client";

import { useRef } from "react";
import { FIELD_META, type FieldDraft } from "@/lib/fields";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// תיבת שדה הניתנת לגרירה ולשינוי גודל מעל עמוד ה-PDF בעורך.
// pageW/pageH = מידות העמוד המרונדר בפיקסלים. הקואורדינטות מנורמלות 0..1.
export function FieldBox({
  field,
  pageW,
  pageH,
  selected,
  onSelect,
  onChange,
}: {
  field: FieldDraft;
  pageW: number;
  pageH: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (f: FieldDraft) => void;
}) {
  const drag = useRef<
    | null
    | { mode: "move" | "resize"; startX: number; startY: number; orig: FieldDraft }
  >(null);
  const meta = FIELD_META[field.type];

  function onPointerDown(e: React.PointerEvent, mode: "move" | "resize") {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...field } };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || pageW === 0 || pageH === 0) return;
    const { mode, startX, startY, orig } = drag.current;
    const dx = (e.clientX - startX) / pageW;
    const dy = (e.clientY - startY) / pageH;
    if (mode === "move") {
      onChange({
        ...orig,
        x: clamp(orig.x + dx, 0, 1 - orig.width),
        y: clamp(orig.y + dy, 0, 1 - orig.height),
      });
    } else {
      onChange({
        ...orig,
        width: clamp(orig.width + dx, 0.02, 1 - orig.x),
        height: clamp(orig.height + dy, 0.012, 1 - orig.y),
      });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    drag.current = null;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      onPointerDown={(e) => onPointerDown(e, "move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "absolute",
        left: `${field.x * pageW}px`,
        top: `${field.y * pageH}px`,
        width: `${field.width * pageW}px`,
        height: `${field.height * pageH}px`,
        borderColor: meta.color,
        backgroundColor: meta.color + "22",
        boxShadow: selected ? `0 0 0 2px ${meta.color}` : "none",
        cursor: "move",
        touchAction: "none",
      }}
      className="flex items-center justify-center overflow-hidden rounded border-2 text-[10px] font-medium text-slate-700 select-none"
    >
      <span className="pointer-events-none truncate px-1">
        {field.label || meta.label}
        {field.required ? " *" : ""}
      </span>
      {/* ידית שינוי גודל בפינה התחתונה */}
      <div
        onPointerDown={(e) => onPointerDown(e, "resize")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 12,
          height: 12,
          backgroundColor: meta.color,
          cursor: "nwse-resize",
          touchAction: "none",
        }}
        className="rounded-tl"
      />
    </div>
  );
}
