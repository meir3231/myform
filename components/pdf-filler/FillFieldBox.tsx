"use client";

import type { CSSProperties } from "react";
import type { FieldDraft } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";

// הודעת ולידציה בשפה פשוטה לפי סוג השדה.
function requiredMessage(type: FieldType): string {
  switch (type) {
    case "checkbox":
      return "יש לסמן תיבה זו";
    case "signature":
      return "נדרשת חתימה";
    case "initials":
      return "נדרשים ראשי תיבות";
    case "date":
      return "יש לבחור תאריך";
    default:
      return "שדה חובה";
  }
}

// שדה אינטראקטיבי בדף המילוי, ממוקם מעל עמוד ה-PDF.
export function FillFieldBox({
  field,
  pageW,
  pageH,
  value,
  signatureDataUrl,
  invalid,
  readOnly,
  preview,
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
  preview?: boolean;
  onChange: (value: string) => void;
  onRequestSignature: () => void;
}) {
  // מיקום/גודל השדה על העמוד — קובע את ה-wrapper. התוכן הפנימי תמיד 100%x100%
  // כדי שכוכבית החובה והודעת השגיאה יוכלו להיות ממוקמות יחסית לשדה, גם מעבר לגבולותיו.
  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: `${field.x * pageW}px`,
    top: `${field.y * pageH}px`,
    width: `${field.width * pageW}px`,
    height: `${field.height * pageH}px`,
  };

  // הדגשת שדות למילוי: רקע תכלת עדין + מסגרת זהובה, כדי שיהיה קל לזהות
  // אילו שדות צריך למלא. שדות נעולים (readOnly, מועתקים אוטומטית) נשארים
  // בעיצוב הניטרלי הקיים — הם לא דורשים פעולה מהלקוח.
  const highlightRing = "0 0 0 1.5px #F59E0B";
  const highlightBg = "rgba(45, 212, 207, 0.18)";
  const ring = invalid ? "0 0 0 2px #ef4444" : highlightRing;
  const fontSize = Math.max(9, field.height * pageH * 0.5);

  // כוכבית חובה — לא אגרסיבית: עיגול אדום קטן בפינה העליונה של השדה.
  // לא מוצגת בשדות נעולים (מועתקים אוטומטית).
  const requiredMark = field.required && !readOnly && (
    <span
      aria-hidden
      className="absolute -left-1.5 -top-1.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-error text-[9px] font-bold leading-none text-white"
    >
      *
    </span>
  );

  // הודעת ולידציה ליד השדה, בשפה פשוטה.
  const errorMessage = invalid && (
    <span
      role="alert"
      className="absolute right-0 top-full z-10 mt-0.5 whitespace-nowrap rounded bg-error px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white"
    >
      {requiredMessage(field.type)}
    </span>
  );

  if (preview) {
    const isSignature = field.type === "signature" || field.type === "initials";
    return (
      <div style={wrapperStyle}>
        <div
          style={{ backgroundColor: highlightBg, boxShadow: highlightRing, fontSize: `${fontSize}px` }}
          className="flex h-full w-full items-center justify-center overflow-hidden rounded px-1 text-slate-500"
        >
          {isSignature ? (
            <span className="text-xs opacity-60">{field.type === "initials" ? "ר״ת" : "חתימה"}</span>
          ) : (
            <span className="truncate opacity-60">{field.label}</span>
          )}
        </div>
        {requiredMark}
      </div>
    );
  }

  if (field.type === "checkbox") {
    const checked = value === "true";
    return (
      <div style={wrapperStyle}>
        <div
          style={{ boxShadow: ring, backgroundColor: highlightBg }}
          className="flex h-full w-full items-center justify-center rounded"
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="cursor-pointer accent-brand"
            style={{ width: "60%", height: "60%" }}
          />
        </div>
        {requiredMark}
        {errorMessage}
      </div>
    );
  }

  if (field.type === "signature" || field.type === "initials") {
    return (
      <div style={wrapperStyle}>
        <button
          type="button"
          onClick={onRequestSignature}
          style={{ boxShadow: ring, backgroundColor: highlightBg }}
          className="flex h-full w-full items-center justify-center overflow-hidden rounded text-xs text-slate-600 hover:brightness-95"
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
        {requiredMark}
        {errorMessage}
      </div>
    );
  }

  const inputType =
    field.type === "number" ? "number" : field.type === "date" ? "date" : "text";

  if (readOnly) {
    return (
      <div style={wrapperStyle}>
        <div
          title="הערך מועתק אוטומטית משדה אחר בטופס"
          style={{ boxShadow: ring, fontSize: `${fontSize}px`, fontFamily: "Arial, Helvetica, sans-serif" }}
          className="flex h-full w-full items-center overflow-hidden rounded bg-slate-100/90 px-1 text-slate-500"
        >
          <span className="truncate">{value || field.label}</span>
          <span className="mr-1 shrink-0 text-[0.7em]" aria-hidden>
            🔗
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <input
        type={inputType}
        value={value}
        placeholder={field.label}
        onChange={(e) => onChange(e.target.value)}
        style={{ boxShadow: ring, backgroundColor: highlightBg, fontSize: `${fontSize}px`, fontFamily: "Arial, Helvetica, sans-serif" }}
        className={`h-full w-full rounded px-1 text-slate-900 outline-none focus:bg-white focus:shadow-[0_0_0_2px_#3b82f6] ${
          field.type === "text" ? "text-right" : ""
        }`}
      />
      {requiredMark}
      {errorMessage}
    </div>
  );
}
