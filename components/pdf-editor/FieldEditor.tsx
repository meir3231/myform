"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { randomUUID } from "@/lib/uuid";
import { FIELD_META, FIELD_TYPES, type FieldDraft } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import { saveFormFields } from "@/app/(admin)/forms/actions";
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
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  function addField(type: FieldType) {
    const meta = FIELD_META[type];
    const f: FieldDraft = {
      id: randomUUID(),
      page,
      x: 0.4,
      y: 0.4,
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
    setErrorMsg(null);
    try {
      await saveFormFields(formId, fields);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "השמירה נכשלה");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* סרגל כלים — נעוץ במקום בזמן גלילת ה-PDF (מסכים רחבים) */}
      <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <span className="text-gold">＋</span> הוספת שדה
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => addField(t)}
                className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-sm"
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
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            גרור כדי למקם, גרור את הפינה כדי לשנות גודל.
          </p>
        </div>

        {/* מאפייני השדה הנבחר */}
        {selected && (
          <div className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-700">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ backgroundColor: `${FIELD_META[selected.type].color}1a`, color: FIELD_META[selected.type].color }}
              >
                <FieldTypeIcon type={selected.type} />
              </span>
              מאפייני שדה
            </h2>
            <label className="mb-1 block text-xs font-medium text-slate-500">תווית</label>
            <input
              value={selected.label}
              onChange={(e) => updateField({ ...selected, label: e.target.value })}
              className="mb-3 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.required}
                onChange={(e) => updateField({ ...selected, required: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
              />
              שדה חובה
            </label>
            <label className="mb-1 block text-xs font-medium text-slate-500">גודל גופן</label>
            <input
              type="number"
              min={6}
              max={72}
              value={selected.font_size}
              onChange={(e) =>
                updateField({ ...selected, font_size: Number(e.target.value) || 12 })
              }
              className="mb-3 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {selected.type !== "signature" && selected.type !== "initials" && (
              <>
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
                <p className="mb-3 text-xs leading-relaxed text-slate-400">
                  הלקוח ימלא רק את שדה המקור — שאר השדות המקושרים יתמלאו
                  אוטומטית באותו ערך.
                </p>
              </>
            )}
            <button onClick={() => deleteField(selected.id)} className="btn-danger-ghost w-full">
              מחיקת שדה
            </button>
          </div>
        )}

        <div className="card p-4">
          <button onClick={handleSave} disabled={status === "saving"} className="btn-primary w-full">
            {status === "saving" ? "שומר..." : "שמירת שדות"}
          </button>
          {status === "saved" && (
            <p className="mt-2 text-center text-sm text-green-600">נשמר ✓</p>
          )}
          {status === "error" && (
            <p className="mt-2 text-center text-sm text-red-600">{errorMsg}</p>
          )}
          <p className="mt-2 text-center text-xs text-slate-400">
            {fields.length} שדות בסך הכל
          </p>
        </div>
      </aside>

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
              onPointerDown={() => setSelectedId(null)}
            >
              <EditorPageCanvas
                pageNumber={page}
                width={renderWidth}
                onRendered={measurePage}
              />
              <div
                style={{ position: "absolute", inset: 0 }}
                onPointerDown={(e) => {
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
              </div>
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
}
