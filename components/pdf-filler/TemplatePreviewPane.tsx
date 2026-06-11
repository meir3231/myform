"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { FieldDraft } from "@/lib/fields";
import { FillFieldBox } from "./FillFieldBox";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

type Sizes = Record<number, { w: number; h: number }>;

const PdfPageCanvas = memo(function PdfPageCanvas({
  pageNum,
  width,
  onMeasure,
}: {
  pageNum: number;
  width: number;
  onMeasure: (w: number, h: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  function measure() {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    if (rect.width) onMeasure(rect.width, rect.height);
  }
  return (
    <Page
      pageNumber={pageNum}
      width={width}
      renderTextLayer={false}
      renderAnnotationLayer={false}
      canvasRef={canvasRef}
      onRenderSuccess={measure}
    />
  );
});

export type TemplatePreviewData = {
  pdfUrl: string;
  fields: FieldDraft[];
  pageCount: number;
};

export function TemplatePreviewPane({
  formId,
  formName,
  data,
  loading,
}: {
  formId: string | null;
  formName?: string;
  data: TemplatePreviewData | null;
  loading: boolean;
}) {
  const [pageNum, setPageNum] = useState(1);
  const [zoomPct, setZoomPct] = useState(100);
  const [sizes, setSizes] = useState<Sizes>({});
  const [containerWidth, setContainerWidth] = useState(700);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset page/zoom when the previewed form changes
  useEffect(() => {
    setPageNum(1);
    setZoomPct(100);
    setSizes({});
  }, [formId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 2;
      if (w > 0) setContainerWidth(Math.min(1000, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setPageSize = useCallback((page: number, w: number, h: number) => {
    setSizes((prev) =>
      prev[page]?.w === w && prev[page]?.h === h ? prev : { ...prev, [page]: { w, h } }
    );
  }, []);

  const renderWidth = Math.round(containerWidth * (zoomPct / 100));
  const pageCount = data?.pageCount ?? 1;
  const pageFields = data?.fields.filter((f) => f.page === pageNum) ?? [];
  const size = sizes[pageNum];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        <button
          onClick={() => setZoomPct(100)}
          className="btn-outline !h-10 !px-3 !text-sm"
          title="מילוי מסך"
        >
          <FitScreenIcon />
          מילוי מסך
        </button>

        <div className="flex h-10 items-center overflow-hidden rounded-xl border border-border">
          <button
            onClick={() => setZoomPct((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
            disabled={zoomPct <= ZOOM_MIN}
            className="flex h-10 w-9 items-center justify-center text-text-secondary transition hover:bg-background disabled:opacity-30"
            title="הקטן"
          >
            −
          </button>
          <span className="w-14 text-center text-sm font-medium text-paper-text">{zoomPct}%</span>
          <button
            onClick={() => setZoomPct((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
            disabled={zoomPct >= ZOOM_MAX}
            className="flex h-10 w-9 items-center justify-center text-text-secondary transition hover:bg-background disabled:opacity-30"
            title="הגדל"
          >
            +
          </button>
        </div>

        <div className="mr-auto flex h-10 items-center gap-1 overflow-hidden rounded-xl border border-border px-1">
          <button
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            className="flex h-8 w-8 items-center justify-center text-text-secondary transition hover:bg-background disabled:opacity-30"
            title="עמוד קודם"
          >
            ‹
          </button>
          <span className="px-2 text-sm font-medium text-paper-text">
            {pageNum} מתוך {pageCount}
          </span>
          <button
            onClick={() => setPageNum((p) => Math.min(pageCount, p + 1))}
            disabled={pageNum >= pageCount}
            className="flex h-8 w-8 items-center justify-center text-text-secondary transition hover:bg-background disabled:opacity-30"
            title="עמוד הבא"
          >
            ›
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div ref={containerRef} className="card flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
        {loading || !data ? (
          loading ? (
            <div className="skeleton h-full w-full max-w-[640px]" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-paper-muted">
              <FormSmallIcon />
              <p className="mt-3 text-sm">בחר תבנית מהרשימה כדי לצפות בה</p>
            </div>
          )
        ) : (
          <div dir="ltr" style={{ position: "relative", width: renderWidth }} className="shrink-0">
            <Document
              key={formId}
              file={data.pdfUrl}
              loading={<div className="skeleton h-[40rem] w-full" />}
              error={<div className="py-12 text-center text-red-500">שגיאה בטעינת הטופס</div>}
            >
              <PdfPageCanvas
                pageNum={pageNum}
                width={renderWidth}
                onMeasure={(w, h) => setPageSize(pageNum, w, h)}
              />
              {size &&
                pageFields.map((f) => (
                  <FillFieldBox
                    key={f.id}
                    field={f}
                    pageW={size.w}
                    pageH={size.h}
                    value=""
                    invalid={false}
                    preview
                    onChange={() => {}}
                    onRequestSignature={() => {}}
                  />
                ))}
            </Document>
          </div>
        )}
      </div>
      {formName && (
        <p className="mt-2 shrink-0 truncate text-center text-sm text-paper-muted">{formName}</p>
      )}
    </div>
  );
}

function FitScreenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FormSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-10 w-10 text-slate-300" aria-hidden>
      <path d="M7 3.5h7l3 3V20a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.5V6a1 1 0 0 0 1 1h2.5M9 12h6M9 15h6M9 9h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
