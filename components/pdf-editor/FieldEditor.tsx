"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import { randomUUID } from "@/lib/uuid";
import { FIELD_META, FIELD_TYPES, type FieldDraft } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import { saveFormFields } from "@/app/(admin)/forms/actions";
import { useToast } from "@/components/Toast";
import { FieldBox } from "./FieldBox";

function FieldTypeIcon({ type, className = "h-4 w-4" }: { type: FieldType; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    className,
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
  formName,
  pdfUrl,
  pageCount,
  initialFields,
}: {
  formId: string;
  formName: string;
  pdfUrl: string;
  pageCount: number;
  initialFields: FieldDraft[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDraft[]>(initialFields);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fieldSearch, setFieldSearch] = useState("");
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

  // ה-slots ב-header (מוגדרים ב-(form-editor)/layout.tsx) שאליהם מוזרקים
  // כותרת העמוד וכפתורי השמירה במקום תיבת החיפוש הגלובלית.
  // נמצאים רק בצד לקוח, לכן useEffect.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [headerTitleSlot, setHeaderTitleSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("header-actions-slot"));
    setHeaderTitleSlot(document.getElementById("header-editor-title"));
  }, []);

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

  const filteredFields = fields.filter((f) => {
    const q = fieldSearch.toLowerCase().trim();
    if (!q) return true;
    return (f.label || FIELD_META[f.type].label).toLowerCase().includes(q);
  });

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

  const updateField = useCallback((updated: FieldDraft) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setStatus("idle");
  }, []);

  const handleFieldContextMenu = useCallback((fieldId: string, e: React.MouseEvent) => {
    setContextMenu({ kind: "field", x: e.clientX, y: e.clientY, fieldId });
  }, []);

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
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : "השמירה נכשלה", "error");
      return false;
    } finally {
      setStatus("idle");
    }
  }

  async function handleSaveAndSend() {
    const ok = await handleSave();
    if (ok) router.push(`/forms/${formId}/send`);
  }

  async function handleSaveAndExit() {
    const ok = await handleSave();
    if (ok) router.push("/templates");
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {headerTitleSlot &&
        createPortal(
          <div className="header-editor-title">
            <nav aria-label="ניווט" className="header-editor-breadcrumb">
              <Link href="/templates">תבניות</Link>
              <span>‹</span>
              <span>עריכת שדות</span>
            </nav>
            <h1 className="header-editor-filename">{formName}</h1>
          </div>,
          headerTitleSlot
        )}

      {headerSlot &&
        createPortal(
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={handleSaveAndExit} disabled={status === "saving"} className="btn-outline h-12">
              {status === "saving" ? "שומר..." : "שמירה"}
            </button>
            <Link href={`/forms/${formId}/preview`} target="_blank" className="btn-secondary">
              תצוגה מקדימה
            </Link>
            <button onClick={handleSaveAndSend} disabled={status === "saving"} className="btn-primary-lg">
              שמירה ושליחה
            </button>
          </div>,
          headerSlot
        )}

      {placing && (
        <p className="shrink-0 text-xs text-slate-400">
          לחצו במקום הרצוי על ה-PDF כדי למקם שדה &quot;{FIELD_META[placing].label}&quot;
          (Esc לביטול).
        </p>
      )}

      <div
        className="grid min-h-0 flex-1 gap-6 overflow-hidden"
        style={{ gridTemplateColumns: "170px minmax(400px,1fr) minmax(260px,292px)" }}
      >
        {/* Field palette (left) */}
        <aside className="card flex h-full w-full flex-col overflow-hidden p-[18px]">
          <h2 className="mb-3 flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-700">
            <span className="text-brand">＋</span> הוספת שדה
          </h2>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
            {FIELD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => startPlacing(t)}
                className={`flex h-[46px] w-full items-center gap-3 rounded-[10px] border px-3 text-sm font-medium transition ${
                  placing === t
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand/50"
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${FIELD_META[t].color}1a`, color: FIELD_META[t].color }}
                >
                  <FieldTypeIcon type={t} className="h-[22px] w-[22px]" />
                </span>
                {FIELD_META[t].label}
              </button>
            ))}
          </div>
        </aside>

        {/* Document area (center) — scrollable */}
        <div ref={containerRef} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background">
          <div className="h-full overflow-y-auto">
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
                                onSelect={setSelectedId}
                                onChange={updateField}
                                onContextMenu={handleFieldContextMenu}
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

        {/* Right panel: all-fields list + selected field properties */}
        <aside className="card flex h-full w-full min-w-0 flex-col overflow-hidden">
          {/* All fields list */}
          <div className="flex max-h-[40%] shrink-0 flex-col overflow-hidden border-b border-slate-100 p-3">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">כל השדות</h2>
              <span className="text-xs text-slate-400">{fields.length} שדות</span>
            </div>
            <div className="relative mb-2 shrink-0">
              <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="חיפוש שדה..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-300 bg-white py-1 pr-8 pl-2 text-xs outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {filteredFields.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  {fields.length === 0 ? "עדיין אין שדות בטופס" : "לא נמצאו שדות התואמים את החיפוש"}
                </p>
              ) : (
                filteredFields.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition ${
                      f.id === selectedId ? "bg-brand/10" : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${FIELD_META[f.type].color}1a`, color: FIELD_META[f.type].color }}
                    >
                      <FieldTypeIcon type={f.type} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {f.label || FIELD_META[f.type].label}
                      <span className="text-slate-400"> · עמ׳ {f.page}</span>
                    </span>
                    {f.required && <span className="shrink-0 text-brand">*</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteField(f.id); }}
                      className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="מחיקת שדה"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected field properties */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {selected ? (
              <div className="space-y-3">
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
                {selected.type === "date" && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!selected.autoFillToday}
                      onChange={(e) =>
                        updateField({ ...selected, autoFillToday: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
                    />
                    מילוי אוטומטי של תאריך היום
                  </label>
                )}
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
              </div>
            ) : (
              <div className="empty-state-pattern flex h-full flex-col items-center justify-center gap-3 rounded-xl text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-slate-400" aria-hidden>
                    <path d="M15 3H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">לא נבחר שדה</p>
                  <p className="mt-0.5 text-xs text-slate-400">לחץ על שדה ב-PDF או ברשימה למעלה</p>
                </div>
              </div>
            )}
          </div>
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
