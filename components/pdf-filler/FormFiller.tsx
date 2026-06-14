"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, pdfjs } from "react-pdf";
import type { FieldDraft } from "@/lib/fields";
import { submitForm, type SubmitState } from "@/app/fill/actions";
import { useToast } from "@/components/Toast";
import { BrandLogo } from "@/components/BrandLogo";
import { FillFieldBox } from "./FillFieldBox";
import { PdfPageCanvas } from "./PdfPageCanvas";
import { SignatureModal } from "./SignatureModal";
import { PRIMARY_FULL } from "./styles";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type Sizes = Record<number, { w: number; h: number }>;

// עמוד בודד: ה-PDF (ממומואיז) + שכבת שדות המילוי שמעליו.
function FillablePage({
  pageNum,
  width,
  size,
  onMeasure,
  fields,
  values,
  signatures,
  invalidIds,
  linkedFieldIds,
  onChange,
  onRequestSignature,
}: {
  pageNum: number;
  width: number;
  size?: { w: number; h: number };
  onMeasure: (w: number, h: number) => void;
  fields: FieldDraft[];
  values: Record<string, string>;
  signatures: Record<string, string>;
  invalidIds: Set<string>;
  linkedFieldIds: Set<string>;
  onChange: (id: string, v: string) => void;
  onRequestSignature: (f: FieldDraft) => void;
}) {
  return (
    <div dir="ltr" style={{ position: "relative", width }} className="mb-6 shadow-sm last:mb-0">
      <PdfPageCanvas pageNum={pageNum} width={width} onMeasure={onMeasure} />
      {size &&
        fields.map((f) => (
          <FillFieldBox
            key={f.id}
            field={f}
            pageW={size.w}
            pageH={size.h}
            value={values[f.id] ?? ""}
            signatureDataUrl={signatures[f.id]}
            invalid={invalidIds.has(f.id)}
            readOnly={linkedFieldIds.has(f.id)}
            onChange={(v) => onChange(f.id, v)}
            onRequestSignature={() => onRequestSignature(f)}
          />
        ))}
    </div>
  );
}

export default function FormFiller({
  token,
  pdfUrl,
  pageCount,
  fields,
  initialValues,
  recipientName,
  formName,
  orgName,
}: {
  token: string;
  pdfUrl: string;
  pageCount: number;
  fields: FieldDraft[];
  initialValues: Record<string, string>;
  recipientName: string;
  formName: string;
  orgName: string;
}) {
  // מיפוי שדה-מקור ← רשימת שדות-יעד שמועתקים ממנו אוטומטית בזמן המילוי
  // (לדוגמה: "שם" שחוזר על עצמו בכמה עמודים — הלקוח ממלא רק את שדה המקור).
  const copyTargets: Record<string, string[]> = {};
  for (const f of fields) {
    if (f.copyFrom) (copyTargets[f.copyFrom] ??= []).push(f.id);
  }
  // שדות "יעד" מוצגים כקריאה-בלבד — ערכם תמיד מגיע מהשדה שהם מקושרים אליו
  const linkedFieldIds = new Set(fields.filter((f) => f.copyFrom).map((f) => f.id));

  // ערכים שהמנהל מילא מראש בעת השליחה (prefill) — מאתחלים איתם את הטופס,
  // כך שהלקוח רואה אותם ממולאים ויכול עדיין לערוך אותם במידת הצורך.
  // אם שדה-מקור מולא מראש, מפיצים את הערך גם לשדות המקושרים אליו.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seeded = { ...initialValues };
    // מילוי אוטומטי של תאריך היום לשדות שהוגדרו לכך וטרם מולאו
    for (const f of fields) {
      if (f.type === "date" && f.autoFillToday && !f.copyFrom && !seeded[f.id]) {
        seeded[f.id] = new Date().toISOString().slice(0, 10);
      }
    }
    for (const [sourceId, targets] of Object.entries(copyTargets)) {
      const v = seeded[sourceId];
      if (v) for (const t of targets) seeded[t] = v;
    }
    return seeded;
  });
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [sizes, setSizes] = useState<Sizes>({});
  const [renderWidth, setRenderWidth] = useState(700);
  const [signingField, setSigningField] = useState<FieldDraft | null>(null);
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const { showToast } = useToast();

  // התקדמות: שדות חובה (לא כולל שדות "יעד" שמוזנים אוטומטית מהעתקה)
  const requiredFields = fields.filter((f) => f.required && !linkedFieldIds.has(f.id));
  const completedCount = requiredFields.filter((f) => {
    if (f.type === "signature" || f.type === "initials") return !!signatures[f.id];
    if (f.type === "checkbox") return values[f.id] === "true";
    return !!values[f.id]?.trim();
  }).length;
  const totalRequired = requiredFields.length;
  const progressPercent = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 100;

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

  function validate(): boolean {
    const invalid = new Set<string>();
    for (const f of fields) {
      if (!f.required) continue;
      if (f.type === "signature" || f.type === "initials") {
        if (!signatures[f.id]) invalid.add(f.id);
      } else if (f.type === "checkbox") {
        if (values[f.id] !== "true") invalid.add(f.id);
      } else if (!values[f.id]?.trim()) {
        invalid.add(f.id);
      }
    }
    setInvalidIds(invalid);
    return invalid.size === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      showToast("יש למלא את כל שדות החובה (מסומנים באדום)", "error");
      return;
    }
    setSubmitting(true);
    try {
      const result: SubmitState = await submitForm(token, { values, signatures });
      if (result.ok) {
        setDone(true);
      } else {
        showToast(result.error ?? "השליחה נכשלה", "error");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "השליחה נכשלה", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col items-center justify-center text-center">
        <div className="page-fade-in card w-full p-8">
          <div className="mb-3 text-5xl">✓</div>
          <h2 className="mb-2 text-xl font-bold text-paper-text">הטופס נשלח בהצלחה</h2>
          <p className="mb-6 text-sm text-text-secondary">
            תודה{recipientName ? ` ${recipientName}` : ""}. הטופס נשמר ונחתם.
          </p>
          <a
            href={`/api/download-completed?token=${encodeURIComponent(token)}`}
            className={PRIMARY_FULL}
          >
            הורדת עותק חתום (PDF)
          </a>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col items-center justify-center text-center">
        <div className="page-fade-in card w-full p-8">
          <BrandLogo size="lg" className="mx-auto mb-6 justify-center" />
          {orgName && (
            <p className="mb-1 text-sm text-text-secondary">טופס מאת {orgName}</p>
          )}
          <h1 className="mb-3 text-xl font-bold text-paper-text">{formName}</h1>
          <p className="mb-6 text-sm leading-relaxed text-text-secondary">
            {recipientName ? `שלום ${recipientName}, ` : ""}
            אנא מלא/י את השדות המסומנים וחתום/חתמי במקומות הנדרשים. התהליך נמשך מספר
            דקות בלבד ואינו דורש הרשמה.
          </p>
          <button onClick={() => setStarted(true)} className={PRIMARY_FULL}>
            התחל מילוי
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] pb-28">
      {totalRequired > 0 && (
        <div className="sticky top-16 z-10 -mx-4 mb-4 border-b border-paper-line bg-white/90 px-4 py-2 backdrop-blur-sm sm:top-[72px] sm:-mx-6 sm:px-6">
          <div className="mx-auto flex max-w-[760px] items-center gap-3">
            <span className="shrink-0 text-xs font-medium text-text-secondary">
              {completedCount} מתוך {totalRequired} שדות חובה הושלמו
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft-border">
              <div
                className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col items-center gap-6">
        <Document
          file={pdfUrl}
          loading={<div className="skeleton mx-auto h-[40rem] w-full max-w-[640px]" />}
          error={<div className="py-12 text-red-500">שגיאה בטעינת הטופס</div>}
        >
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
            <FillablePage
              key={pageNum}
              pageNum={pageNum}
              width={renderWidth}
              size={sizes[pageNum]}
              onMeasure={(w, h) => setPageSize(pageNum, w, h)}
              fields={fields.filter((f) => f.page === pageNum)}
              values={values}
              signatures={signatures}
              invalidIds={invalidIds}
              linkedFieldIds={linkedFieldIds}
              onChange={(id, v) => {
                setValues((p) => {
                  const next = { ...p, [id]: v };
                  // הפצה אוטומטית לכל השדות שמקושרים לשדה הזה כ"מקור"
                  const targets = copyTargets[id];
                  if (targets) for (const t of targets) next[t] = v;
                  return next;
                });
                setInvalidIds((prev) => {
                  if (!prev.has(id) && !copyTargets[id]) return prev;
                  const next = new Set(prev);
                  next.delete(id);
                  for (const t of copyTargets[id] ?? []) next.delete(t);
                  return next;
                });
              }}
              onRequestSignature={(f) => setSigningField(f)}
            />
          ))}
        </Document>
      </div>

      {/* סרגל שליחה קבוע בתחתית — כפתור ברוחב מלא, h=50px (מובייל) / 48px (דסקטופ) */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-paper-line bg-white/95 p-4 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-[760px]">
          <button onClick={handleSubmit} disabled={submitting} className={PRIMARY_FULL}>
            {submitting ? "שולח..." : "סיום ושליחה"}
          </button>
        </div>
      </div>

      {signingField && (
        <SignatureModal
          title={signingField.type === "initials" ? "ראשי תיבות" : "חתימה"}
          onClose={() => setSigningField(null)}
          onSave={(dataUrl) => {
            setSignatures((p) => ({ ...p, [signingField.id]: dataUrl }));
            setInvalidIds((prev) => {
              const next = new Set(prev);
              next.delete(signingField.id);
              return next;
            });
            setSigningField(null);
          }}
        />
      )}
    </div>
  );
}
