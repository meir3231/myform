"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import { randomUUID } from "@/lib/uuid";
import { FIELD_META, type FieldDraft } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import { saveFormFields } from "@/app/(admin)/forms/actions";
import { useToast } from "@/components/Toast";
import { FieldBox } from "./FieldBox";
import { FieldMiniToolbar } from "./FieldMiniToolbar";
import { FieldsPanel } from "./FieldsPanel";
import { EditorToolbar } from "./EditorToolbar";
import { CloseIcon } from "./icons";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // מעקב אחר העמוד הנראה כעת בגלילה, לתצוגת "עמוד X מתוך Y" ולכפתורי ניווט.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || pageCount <= 1) {
      setCurrentPage(1);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setCurrentPage((prev) => {
          let best = prev;
          let bestRatio = 0;
          for (const entry of entries) {
            const page = Number((entry.target as HTMLElement).dataset.page);
            if (entry.intersectionRatio > bestRatio) {
              bestRatio = entry.intersectionRatio;
              best = page;
            }
          }
          return bestRatio > 0 ? best : prev;
        });
      },
      { root, threshold: [0.15, 0.5, 0.85] }
    );
    Object.values(pageRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // pageSizes נוסף כתלות כדי להפעיל מחדש את ה-effect כשתגי העמודים מתרנדרים
    // בפועל בתוך <Document> (react-pdf מרנדר children רק לאחר טעינת ה-PDF,
    // כך שב-mount הראשוני pageRefs ריק).
  }, [pageCount, renderWidth, pageSizes]);

  // מצב מסך מלא של אזור המסמך
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

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

  function duplicateField(id: string) {
    const f = fields.find((x) => x.id === id);
    if (!f) return;
    const offset = 0.02;
    const x = Math.min(Math.max(f.x + offset, 0), 1 - f.width);
    const y = Math.min(Math.max(f.y + offset, 0), 1 - f.height);
    const copy: FieldDraft = { ...f, id: randomUUID(), x, y };
    setFields((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    setStatus("idle");
  }

  function alignFieldCenter(id: string) {
    const f = fields.find((x) => x.id === id);
    if (!f) return;
    updateField({ ...f, x: (1 - f.width) / 2, y: (1 - f.height) / 2 });
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

  const fieldsPanel = useMemo(
    () => (
      <FieldsPanel
        fields={fields}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUpdate={updateField}
        onDelete={deleteField}
        search={fieldSearch}
        onSearchChange={setFieldSearch}
      />
    ),
    [fields, selectedId, updateField, fieldSearch]
  );

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

      <div className="editor-grid min-h-0 flex-1 overflow-hidden">
        {/* פאנל "כל השדות" — 300px, מימין למסמך, מוסתר מתחת ל-1200px */}
        <aside className="card editor-fields-panel min-w-0 flex-col overflow-hidden">{fieldsPanel}</aside>

        {/* אזור המסמך — גדול, עם סרגל כלים פנימי */}
        <div
          ref={containerRef}
          className="editor-doc-area flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background"
        >
          <EditorToolbar
            placing={placing}
            onStartPlacing={startPlacing}
            currentPage={currentPage}
            pageCount={pageCount}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            fieldCount={fields.length}
            onOpenFieldsDrawer={() => setDrawerOpen(true)}
          />

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
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
                      <div
                        ref={(el) => { pageRefs.current[pageNum] = el; }}
                        data-page={pageNum}
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

                          {/* Mini-toolbar צף מעל השדה הנבחר */}
                          {size && !placing && selected && selected.page === pageNum && (
                            <FieldMiniToolbar
                              left={selected.x * size.w}
                              top={selected.y * size.h}
                              onDuplicate={() => duplicateField(selected.id)}
                              onAlignCenter={() => alignFieldCenter(selected.id)}
                              onDelete={() => deleteField(selected.id)}
                            />
                          )}

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
      </div>

      {/* מגירת "כל השדות" — מוצגת מתחת ל-1200px */}
      {drawerOpen && (
        <>
          <div className="editor-fields-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="editor-fields-drawer card">
            <div className="flex shrink-0 items-center justify-between border-b border-soft-border p-3">
              <h2 className="text-sm font-semibold text-navy">כל השדות</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary transition hover:bg-slate-100 hover:text-navy"
                aria-label="סגירה"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{fieldsPanel}</div>
          </div>
        </>
      )}

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
