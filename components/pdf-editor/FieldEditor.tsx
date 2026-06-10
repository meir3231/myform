"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { randomUUID } from "@/lib/uuid";
import { FIELD_META, FIELD_TYPES, type FieldDraft } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import { saveFormFields } from "@/app/(admin)/forms/actions";
import { useToast } from "@/components/Toast";
import { FieldBox } from "./FieldBox";

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
    case "checkbox":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M7.5 12l3 3 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

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

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PageSizes = Record<number, { w: number; h: number }>;
type GhostPos = { x: number; y: number; page: number } | null;
type ContextMenuState =
  | { kind: "field"; x: number; y: number; fieldId: string }
  | { kind: "page"; x: number; y: number; page: number; pos: { x: number; y: number } }
  | null;

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renderWidth, setRenderWidth] = useState(800);
  const [pageSizes, setPageSizes] = useState<PageSizes>({});
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const { showToast } = useToast();
  const [placing, setPlacing] = useState<FieldType | null>(null);
  const [ghostPos, setGhostPos] = useState<GhostPos>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [clipboard, setClipboard] = useState<FieldDraft | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  const measurePage = useCallback((pageNum: number) => {
    const el = pageRefs.current[pageNum];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width && rect.height) {
      setPageSizes((prev) =>
        prev[pageNum]?.w === rect.width && prev[pageNum]?.h === rect.height
          ? prev
          : { ...prev, [pageNum]: { w: rect.width, h: rect.height } }
      );
    }
  }, []);

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (placing) {
          setPlacing(null);
          setGhostPos(null);
        }
        if (contextMenu) setContextMenu(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [placing, contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    function close() {
      setContextMenu(null);
    }
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  function startPlacing(type: FieldType) {
    setPlacing((prev) => (prev === type ? null : type));
    setGhostPos(null);
    setSelectedId(null);
  }

  function normalizedFromPage(pageNum: number, e: { clientX: number; clientY: number }) {
    const el = pageRefs.current[pageNum];
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function placeField(type: FieldType, centerX: number, centerY: number, pageNum: number) {
    const meta = FIELD_META[type];
    const x = Math.min(Math.max(centerX - meta.defaultW / 2, 0), 1 - meta.defaultW);
    const y = Math.min(Math.max(centerY - meta.defaultH / 2, 0), 1 - meta.defaultH);
    const f: FieldDraft = {
      id: randomUUID(),
      page: pageNum,
      x,
      y,
      width: meta.defaultW,
      height: meta.defaultH,
      type,
      label: meta.label,
      required: type === "signature",
      font_size: 14,
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

  function copyField(id: string) {
    const f = fields.find((x) => x.id === id);
    if (f) setClipboard(f);
    setContextMenu(null);
  }

  function pasteField(pageNum: number, centerX: number, centerY: number) {
    if (!clipboard) return;
    const x = Math.min(Math.max(centerX - clipboard.width / 2, 0), 1 - clipboard.width);
    const y = Math.min(Math.max(centerY - clipboard.height / 2, 0), 1 - clipboard.height);
    const f: FieldDraft = { ...clipboard, id: randomUUID(), page: pageNum, x, y };
    setFields((prev) => [...prev, f]);
    setSelectedId(f.id);
    setContextMenu(null);
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
      {/* Toolbar */}
      <div className="card sticky top-[72px] z-20 flex flex-wrap items-center gap-3 bg-white/95 p-3 backdrop-blur-sm">
        <h2 className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-700">
          <span className="text-brand">＋</span> הוספת שדה
        </h2>
        <div className="flex flex-wrap gap-2">
          {FIELD_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => startPlacing(t)}
              className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition hover:-translate-y-0.5 hover:shadow-sm ${
                placing === t
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand/50"
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

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* PDF area — scrollable */}
        <div ref={containerRef} className="card overflow-hidden p-0">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 180px)" }}
          >
            <Document
              file={pdfUrl}
              loading={<div className="skeleton mx-auto h-[40rem] w-full max-w-[640px]" />}
              error={<div className="py-12 text-center text-red-500">שגיאה בטעינת ה-PDF</div>}
            >
              <div className="flex flex-col items-center gap-6 p-4">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
                  const size = pageSizes[pageNum];
                  const pageFields = fields.filter((f) => f.page === pageNum);
                  return (
                    <div key={pageNum} className="w-full">
                      {pageCount > 1 && (
                        <div className="mb-1.5 text-center text-xs text-slate-400">
                          עמוד {pageNum} מתוך {pageCount}
                        </div>
                      )}
                      <div
                        ref={(el) => { pageRefs.current[pageNum] = el; }}
                        dir="ltr"
                        style={{ position: "relative", width: renderWidth }}
                        className={`mx-auto shadow-sm ${placing ? "cursor-crosshair" : ""}`}
                      >
                        <EditorPageCanvas
                          pageNumber={pageNum}
                          width={renderWidth}
                          onRendered={() => measurePage(pageNum)}
                        />
                        <div
                          style={{ position: "absolute", inset: 0 }}
                          onPointerMove={(e) => {
                            if (!placing) return;
                            const pos = normalizedFromPage(pageNum, e);
                            if (pos) setGhostPos({ ...pos, page: pageNum });
                          }}
                          onPointerLeave={() => {
                            if (ghostPos?.page === pageNum) setGhostPos(null);
                          }}
                          onPointerDown={(e) => {
                            if (placing) {
                              const pos = normalizedFromPage(pageNum, e);
                              if (pos) placeField(placing, pos.x, pos.y, pageNum);
                              setPlacing(null);
                              setGhostPos(null);
                              return;
                            }
                            if (e.target === e.currentTarget) setSelectedId(null);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (placing) return;
                            const pos = normalizedFromPage(pageNum, e);
                            if (pos) setContextMenu({ kind: "page", x: e.clientX, y: e.clientY, page: pageNum, pos });
                          }}
                        >
                          {size &&
                            pageFields.map((f) => (
                              <FieldBox
                                key={f.id}
                                field={f}
                                pageW={size.w}
                                pageH={size.h}
                                selected={f.id === selectedId}
                                onSelect={() => setSelectedId(f.id)}
                                onChange={updateField}
                                onContextMenu={(e) =>
                                  setContextMenu({ kind: "field", x: e.clientX, y: e.clientY, fieldId: f.id })
                                }
                              />
                            ))}

                          {/* Ghost preview */}
                          {placing && ghostPos?.page === pageNum && size &&
                            (() => {
                              const meta = FIELD_META[placing];
                              const x = Math.min(Math.max(ghostPos.x - meta.defaultW / 2, 0), 1 - meta.defaultW);
                              const y = Math.min(Math.max(ghostPos.y - meta.defaultH / 2, 0), 1 - meta.defaultH);
                              return (
                                <div
                                  className="pointer-events-none absolute rounded border-2 border-dashed"
                                  style={{
                                    left: x * size.w,
                                    top: y * size.h,
                                    width: meta.defaultW * size.w,
                                    height: meta.defaultH * size.h,
                                    borderColor: meta.color,
                                    backgroundColor: `${meta.color}1a`,
                                  }}
                                />
                              );
                            })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Document>
          </div>
        </div>

        {/* Field properties panel — always present to prevent layout shift */}
        <aside className="card h-fit space-y-3 p-4 lg:sticky lg:top-[80px]">
          {selected ? (
            <>
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
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                          !f.copyFrom
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-slate-400" aria-hidden>
                  <path d="M15 3H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">לא נבחר שדה</p>
                <p className="mt-0.5 text-xs text-slate-400">לחץ על שדה ב-PDF לעריכה</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.kind === "field" ? (
            <button
              onClick={() => copyField(contextMenu.fieldId)}
              className="flex w-full items-center px-3 py-1.5 text-start text-sm text-slate-700 transition hover:bg-slate-50"
            >
              העתק
            </button>
          ) : (
            <button
              onClick={() => pasteField(contextMenu.page, contextMenu.pos.x, contextMenu.pos.y)}
              disabled={!clipboard}
              className="flex w-full items-center px-3 py-1.5 text-start text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              הדבק
            </button>
          )}
        </div>
      )}
    </div>
  );
}
