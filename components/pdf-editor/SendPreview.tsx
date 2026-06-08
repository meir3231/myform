"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// תצוגה מקדימה לקריאה-בלבד של ה-PDF במסך "שליחה ללקוח" — בלי שכבת שדות אינטראקטיבית.
export default function SendPreview({
  pdfUrl,
  pageCount,
}: {
  pdfUrl: string;
  pageCount: number;
}) {
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(520);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(640, el.clientWidth - 2);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="card p-4">
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

      <div ref={containerRef} className="flex justify-center">
        <Document
          file={pdfUrl}
          loading={<div className="skeleton mx-auto h-[40rem] w-full max-w-[640px]" />}
          error={<div className="py-12 text-red-500">שגיאה בטעינת ה-PDF</div>}
        >
          <div dir="ltr">
            <Page pageNumber={page} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
          </div>
        </Document>
      </div>
    </div>
  );
}
