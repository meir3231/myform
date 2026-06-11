"use client";

import { memo, useRef } from "react";
import { Page } from "react-pdf";

// ה-canvas של ה-PDF מבודד ב-memo: מרונדר רק כשהעמוד/הרוחב משתנים, ולא בכל הקשה.
// זה מונע רינדור מחדש יקר של ה-PDF בזמן מילוי טופס/תצוגה מקדימה.
export const PdfPageCanvas = memo(function PdfPageCanvas({
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
