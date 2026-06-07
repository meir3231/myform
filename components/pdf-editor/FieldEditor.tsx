"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { randomUUID } from "@/lib/uuid";
import { FIELD_META, FIELD_TYPES, type FieldDraft } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import { saveFormFields } from "@/app/(admin)/forms/actions";
import { FieldBox } from "./FieldBox";

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
      {/* סרגל כלים */}
      <aside className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">הוספת שדה</h2>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => addField(t)}
                className="rounded-lg border px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                style={{ borderColor: FIELD_META[t].color }}
              >
                + {FIELD_META[t].label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            גרור כדי למקם, גרור את הפינה כדי לשנות גודל.
          </p>
        </div>

        {/* מאפייני השדה הנבחר */}
        {selected && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">מאפייני שדה</h2>
            <label className="mb-1 block text-xs text-slate-500">תווית</label>
            <input
              value={selected.label}
              onChange={(e) => updateField({ ...selected, label: e.target.value })}
              className="mb-3 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.required}
                onChange={(e) => updateField({ ...selected, required: e.target.checked })}
              />
              שדה חובה
            </label>
            <label className="mb-1 block text-xs text-slate-500">גודל גופן</label>
            <input
              type="number"
              min={6}
              max={72}
              value={selected.font_size}
              onChange={(e) =>
                updateField({ ...selected, font_size: Number(e.target.value) || 12 })
              }
              className="mb-3 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              onClick={() => deleteField(selected.id)}
              className="w-full rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100"
            >
              מחיקת שדה
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
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
      <div ref={containerRef} className="rounded-2xl bg-white p-4 shadow-sm">
        {pageCount > 1 && (
          <div className="mb-3 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
            >
              → הקודם
            </button>
            <span className="text-sm text-slate-600">
              עמוד {page} מתוך {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
            >
              הבא ←
            </button>
          </div>
        )}

        <div className="flex justify-center">
          <Document
            file={pdfUrl}
            loading={<div className="py-12 text-slate-400">טוען PDF...</div>}
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
