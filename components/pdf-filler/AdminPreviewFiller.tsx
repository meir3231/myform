"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { FieldDraft } from "@/lib/fields";
import { FillFieldBox } from "./FillFieldBox";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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

export function AdminPreviewFiller({
  formId,
  pdfUrl,
  pageCount,
  fields,
}: {
  formId: string;
  pdfUrl: string;
  pageCount: number;
  fields: FieldDraft[];
}) {
  const [sizes, setSizes] = useState<Sizes>({});
  const [renderWidth, setRenderWidth] = useState(700);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(800, el.clientWidth - 2);
      if (w > 0) setRenderWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setPageSize = useCallback((page: number, w: number, h: number) => {
    setSizes((prev) =>
      prev[page]?.w === w && prev[page]?.h === h ? prev : { ...prev, [page]: { w, h } }
    );
  }, []);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      {/* Preview banner */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="text-lg">👁</span>
        <span className="font-medium">תצוגה מקדימה — כפי שהלקוח יראה את הטופס</span>
        <a
          href={`/forms/${formId}/edit`}
          className="mr-auto rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
        >
          חזרה לעריכה
        </a>
      </div>

      <div ref={containerRef} className="flex flex-col items-center gap-6">
        <Document
          file={pdfUrl}
          loading={<div className="skeleton mx-auto h-[40rem] w-full max-w-[640px]" />}
          error={<div className="py-12 text-red-500">שגיאה בטעינת הטופס</div>}
        >
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
            const size = sizes[pageNum];
            const pageFields = fields.filter((f) => f.page === pageNum);
            return (
              <div
                key={pageNum}
                dir="ltr"
                style={{ position: "relative", width: renderWidth }}
                className="shadow-sm"
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
              </div>
            );
          })}
        </Document>
      </div>
    </div>
  );
}
