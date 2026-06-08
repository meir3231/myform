"use client";

import type { FieldDraft } from "@/lib/fields";

// שדה אינטראקטיבי בדף המילוי, ממוקם מעל עמוד ה-PDF.
export function FillFieldBox({
  field,
  pageW,
  pageH,
  value,
  signatureDataUrl,
  invalid,
  readOnly,
  onChange,
  onRequestSignature,
}: {
  field: FieldDraft;
  pageW: number;
  pageH: number;
  value: string;
  signatureDataUrl?: string;
  invalid: boolean;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onRequestSignature: () => void;
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${field.x * pageW}px`,
    top: `${field.y * pageH}px`,
    width: `${field.width * pageW}px`,
    height: `${field.height * pageH}px`,
  };

  const ring = invalid ? "0 0 0 2px #ef4444" : "0 0 0 1px #94a3b8";
  const fontSize = Math.max(9, field.height * pageH * 0.5);

  if (field.type === "signature" || field.type === "initials") {
    return (
      <button
        type="button"
        onClick={onRequestSignature}
        style={{ ...style, boxShadow: ring }}
        className="flex items-center justify-center overflow-hidden rounded bg-white/70 text-xs text-slate-500 hover:bg-blue-50"
      >
        {signatureDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signatureDataUrl}
            alt="חתימה"
            className="h-full w-full object-contain"
          />
        ) : (
          <span>{field.type === "initials" ? "ר״ת ✍" : "לחץ לחתימה ✍"}</span>
        )}
      </button>
    );
  }

  const inputType =
    field.type === "number" ? "number" : field.type === "date" ? "date" : "text";

  if (readOnly) {
    return (
      <div
        title="הערך מועתק אוטומטית משדה אחר בטופס"
        style={{ ...style, boxShadow: ring, fontSize: `${fontSize}px` }}
        className="flex items-center overflow-hidden rounded bg-slate-100/90 px-1 text-slate-500"
      >
        <span className="truncate">{value || field.label}</span>
        <span className="mr-1 shrink-0 text-[0.7em]" aria-hidden>
          🔗
        </span>
      </div>
    );
  }

  return (
    <input
      type={inputType}
      value={value}
      placeholder={field.label}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...style, boxShadow: ring, fontSize: `${fontSize}px` }}
      className="rounded bg-white/80 px-1 text-slate-900 outline-none focus:bg-white focus:shadow-[0_0_0_2px_#3b82f6]"
    />
  );
}
