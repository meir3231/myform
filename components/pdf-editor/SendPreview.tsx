"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function SendPreview({
  pdfUrl,
  pageCount,
}: {
  pdfUrl: string;
  pageCount: number;
}) {
  const [width, setWidth] = useState(520);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(700, el.clientWidth - 2);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <Document
        file={pdfUrl}
        loading={<div className="skeleton mx-auto h-[40rem] w-full max-w-[640px]" />}
        error={<div className="py-12 text-center text-red-500">שגיאה בטעינת ה-PDF</div>}
      >
        <div className="flex flex-col items-center gap-5 py-4">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} dir="ltr" className="shadow-sm">
              <Page
                pageNumber={pageNum}
                width={width}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              {pageCount > 1 && (
                <div className="bg-slate-50 py-1 text-center text-xs text-slate-400">
                  עמוד {pageNum} מתוך {pageCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </Document>
    </div>
  );
}
