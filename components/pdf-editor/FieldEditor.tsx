"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { randomUUID } from "@/lib/uuid";
import { FIELD_META, FIELD_TYPES, type FieldDraft } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import { saveFormFields } from "@/app/(admin)/forms/actions";
import { useToast } from "@/components/Toast";
import { FieldBox } from "./FieldBox";

// אייקון קטן לכל סוג שדה — מסייע למנהל לזהות חזותית את סוגי השדות בפאנל ההוספה.
function FieldTypeIcon({ type }: { type: FieldType }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    className: "h-4 w-4",
    "aria-hidden": true,
  };
  switch (type) {
    case "text":
      return (
        <svg {...common}>
          <path d="M5 6h14M5 12h14M5 18h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "number":
      return (
        <svg {...common}>
          <path d="M5 9h14M5 15h14M9 5l-2 14M16 5l-2 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "date":
      return (
        <svg {...common}>
          <rect x="4.5" y="5.5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4.5 10h15M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "signature":
      return (
        <svg {...common}>
          <path d="M4 17c2-1 3-3 3.5-5 .6-2.4 1-5 2.5-5s.5 4-.5 6.5S6 18 6 18s4 1 7-1 4-3.5 6-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "initials":
      return (
        <svg {...common}>
          <path d="M6 17V7l4 7 4-7v10M16 7h3M16 12h3M16 17h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

// ה-canvas של ה-PDF מבודד ב-memo: לא מרונדר מחדש בכל גרירת שדה, רק כשהעמוד/הרוחב משתנים.
const EditorPageCanvas = memo(function EditorPageCanvas({
  pageNumber,
  width,
  onRendered,
}: {
  pageNumber: number;
  width: number;
  onRendered: () => void;
}) {
  return (
    <Page
      pageNumber={pageNumber}
      width={width}
      renderTextLayer={false}
      renderAnnotationLayer={false}
      onRenderSuccess={onRendered}
    />
  );
});

// הגדרת ה-worker של pdfjs (נטען בצד לקוח).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function FieldEditor({
  formId,
  pdfUrl,
  pageCount,
  initialFields,
}: {
  formId: string;
  pdfUrl: string;
  pageCount: number;
  initialFields: FieldDraft[];
}) {
  const [fields, setFields] = useState<FieldDraft[]>(initialFields);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renderWidth, setRenderWidth] = useState(800);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const { showToast } = useToast();
  // מצב "מיקום שדה": אחרי לחיצה על סוג שדה, השדה ממתין למיקום בקליק על ה-PDF
  const [placing, setPlacing] = useState<FieldType | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);

  // מדידת רוחב האזור והתאמת רוחב הרינדור
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(900, el.clientWidth - 2);
      if (w > 0) setRenderWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // מדידת מידות העמוד המרונדר בפועל (לצורך מיקום השדות)
  const measurePage = useCallback(() => {
    const el = pageWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPageSize({ w: rect.width, h: rect.height });
  }, []);

  const pageFields = useMemo(
    () => fields.filter((f) => f.page === page),
    [fields, page]
  );
  const selected = fields.find((f) => f.id === selectedId) ?? null;

  // מקש Escape מבטל מצב "מיקום שדה"
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && placing) {
        setPlacing(null);
        setGhostPos(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [placing]);

  // לחיצה על סוג שדה לא יוצרת אותו מיד — נכנסים למצב "מיקום", והשדה
  // יווצר במקום שעליו ילחץ המנהל בתצוגת ה-PDF (ראו placeField/normalizedFromEvent).
  function startPlacing(type: FieldType) {
    setPlacing((prev) => (prev === type ? null : type));
    setGhostPos(null);
    setSelectedId(null);
  }

  // ממיר נקודת עכבר (קליינט) לקואורדינטות מנורמלות 0..1 ביחס לעמוד המוצג
  function normalizedFromEvent(e: { clientX: number; clientY: number }) {
    const el = pageWrapRef.current;
    if (!el || pageSize.w === 0 || pageSize.h === 0) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function placeField(type: FieldType, centerX: number, centerY: number) {
    const meta = FIELD_META[type];
    const x = Math.min(Math.max(centerX - meta.defaultW / 2, 0), 1 - meta.defaultW);
    const y = Math.min(Math.max(centerY - meta.defaultH / 2, 0), 1 - meta.defaultH);
    const f: FieldDraft = {
      id: randomUUID(),
      page,
      x,
      y,
      width: meta.defaultW,
      height: meta.defaultH,
      type,
      label: meta.label,
      required: type === "signature",
      font_size: 12,
      copyFrom: null,
    };
    setFields((prev) => [...prev, f]);
    setSelectedId(f.id);
    setStatus("idle");
  }

  function updateField(updated: FieldDraft) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setStatus("idle");
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    try {
      await saveFormFields(formId, fields);
      showToast("השדות נשמרו בהצלחה", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "השמירה נכשלה", "error");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-4">
      {/* שורת כלים אופקית מעל ה-PDF */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <h2 className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-700">
          <span className="text-gold">＋</span> הוספת שדה
        </h2>
        <div className="flex flex-wrap gap-2">
          {FIELD_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => startPlacing(t)}
              className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition hover:-translate-y-0.5 hover:shadow-sm ${
                placing === t
                  ? "border-gold bg-gold/10 text-brand"
                  : "border-slate-200 bg-white text-slate-700 hover:border-gold/50"
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${FIELD_META[t].color}1a`, color: FIELD_META[t].color }}
              >
                <FieldTypeIcon type={t} />
              </span>
              {FIELD_META[t].label}
            </button>
          ))}
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-3">
          <span className="text-xs text-slate-400">{fields.length} שדות בסך הכל</span>
          <button onClick={handleSave} disabled={status === "saving"} className="btn-primary !px-5">
            {status === "saving" ? "שומר..." : "שמירת שדות"}
          </button>
        </div>
      </div>

      {placing && (
        <p className="text-xs text-slate-400">
          לחצו במקום הרצוי על ה-PDF כדי למקם שדה &quot;{FIELD_META[placing].label}&quot;
          (Esc לביטול).
        </p>
      )}

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-[1fr_300px]" : ""}`}>
        {/* אזור ה-PDF */}
        <div ref={containerRef} className="card p-4">
          {pageCount > 1 && (
            <div className="mb-3 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary !px-3 !py-1 disabled:opacity-40"
              >
                → הקודם
              </button>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                עמוד {page} מתוך {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="btn-secondary !px-3 !py-1 disabled:opacity-40"
              >
                הבא ←
              </button>
            </div>
          )}

          <div className="flex justify-center">
            <Document
              file={pdfUrl}
              loading={<div className="skeleton mx-auto h-[40rem] w-full max-w-[640px]" />}
              error={<div className="py-12 text-red-500">שגיאה בטעינת ה-PDF</div>}
            >
              {/* dir=ltr כדי שמיקום פיזי (left/top) יתאים תמיד לפינה השמאלית-עליונה */}
              <div
                ref={pageWrapRef}
                dir="ltr"
                style={{ position: "relative", width: renderWidth }}
                className={placing ? "cursor-crosshair" : ""}
              >
                <EditorPageCanvas
                  pageNumber={page}
                  width={renderWidth}
                  onRendered={measurePage}
                />
                <div
                  style={{ position: "absolute", inset: 0 }}
                  onPointerMove={(e) => {
                    if (!placing) return;
                    const pos = normalizedFromEvent(e);
                    if (pos) setGhostPos(pos);
                  }}
                  onPointerLeave={() => setGhostPos(null)}
                  onPointerDown={(e) => {
                    if (placing) {
                      const pos = normalizedFromEvent(e);
                      if (pos) placeField(placing, pos.x, pos.y);
                      setPlacing(null);
                      setGhostPos(null);
                      return;
                    }
                    // לחיצה על אזור ריק מבטלת בחירה
                    if (e.target === e.currentTarget) setSelectedId(null);
                  }}
                >
                  {pageSize.w > 0 &&
                    pageFields.map((f) => (
                      <FieldBox
                        key={f.id}
                        field={f}
                        pageW={pageSize.w}
                        pageH={pageSize.h}
                        selected={f.id === selectedId}
                        onSelect={() => setSelectedId(f.id)}
                        onChange={updateField}
                      />
                    ))}

                  {/* תצוגת "רפאים" — עוקבת אחרי העכבר במצב מיקום שדה */}
                  {placing &&
                    ghostPos &&
                    pageSize.w > 0 &&
                    (() => {
                      const meta = FIELD_META[placing];
                      const x = Math.min(Math.max(ghostPos.x - meta.defaultW / 2, 0), 1 - meta.defaultW);
                      const y = Math.min(Math.max(ghostPos.y - meta.defaultH / 2, 0), 1 - meta.defaultH);
                      return (
                        <div
                          className="pointer-events-none absolute rounded border-2 border-dashed"
                          style={{
                            left: x * pageSize.w,
                            top: y * pageSize.h,
                            width: meta.defaultW * pageSize.w,
                            height: meta.defaultH * pageSize.h,
                            borderColor: meta.color,
                            backgroundColor: `${meta.color}1a`,
                          }}
                        />
                      );
                    })()}
                </div>
              </div>
            </Document>
          </div>
        </div>

        {/* מאפייני השדה הנבחר — מוצג רק כשיש שדה נבחר */}
        {selected && (
          <aside className="card h-fit space-y-3 p-4 lg:sticky lg:top-4">
            <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-700">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ backgroundColor: `${FIELD_META[selected.type].color}1a`, color: FIELD_META[selected.type].color }}
              >
                <FieldTypeIcon type={selected.type} />
              </span>
              מאפייני שדה
            </h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">תווית</label>
              <input
                value={selected.label}
                onChange={(e) => updateField({ ...selected, label: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.required}
                onChange={(e) => updateField({ ...selected, required: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
              />
              שדה חובה
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">גודל גופן</label>
              <input
                type="number"
                min={6}
                max={72}
                value={selected.font_size}
                onChange={(e) =>
                  updateField({ ...selected, font_size: Number(e.target.value) || 12 })
                }
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            {selected.type !== "signature" && selected.type !== "initials" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  העתקת ערך משדה אחר
                </label>
                <select
                  value={selected.copyFrom ?? ""}
                  onChange={(e) =>
                    updateField({ ...selected, copyFrom: e.target.value || null })
                  }
                  className="mb-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">— ללא (מילוי עצמאי) —</option>
                  {fields
                    .filter(
                      (f) =>
                        f.id !== selected.id &&
                        f.type === selected.type &&
                        !f.copyFrom // מונע שרשראות/מעגלים: רק שדות "מקור" ניתנים לבחירה
                    )
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label || FIELD_META[f.type].label} (עמ׳ {f.page})
                      </option>
                    ))}
                </select>
                <p className="text-xs leading-relaxed text-slate-400">
                  הלקוח ימלא רק את שדה המקור — שאר השדות המקושרים יתמלאו
                  אוטומטית באותו ערך.
                </p>
              </div>
            )}
            <button onClick={() => deleteField(selected.id)} className="btn-danger-ghost w-full">
              מחיקת שדה
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
