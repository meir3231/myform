"use client";

import { useEffect, useRef } from "react";
import SignaturePad from "signature_pad";

// מודאל לציור חתימה. בשמירה מחזיר PNG כ-dataURL.
export function SignatureModal({
  title,
  onClose,
  onSave,
}: {
  title: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // התאמת רזולוציית הקנבס לצפיפות הפיקסלים למניעת טשטוש
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx?.scale(ratio, ratio);

    padRef.current = new SignaturePad(canvas, {
      penColor: "#0f172a",
      backgroundColor: "rgba(255,255,255,0)",
    });

    return () => {
      padRef.current?.off();
      padRef.current = null;
    };
  }, []);

  function handleSave() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    onSave(pad.toDataURL("image/png"));
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel max-w-md">
        <h3 className="mb-3 text-lg font-semibold text-slate-800">{title}</h3>
        <canvas
          ref={canvasRef}
          className="h-48 w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-slate-50"
        />
        <div className="mt-4 flex justify-between gap-2">
          <button
            onClick={() => padRef.current?.clear()}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            ניקוי
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              אישור החתימה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
