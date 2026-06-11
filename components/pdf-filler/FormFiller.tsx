"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, pdfjs } from "react-pdf";
import type { FieldDraft } from "@/lib/fields";
import { submitForm, type SubmitState } from "@/app/fill/actions";
import { useToast } from "@/components/Toast";
import { FillFieldBox } from "./FillFieldBox";
import { PdfPageCanvas } from "./PdfPageCanvas";
import { SignatureModal } from "./SignatureModal";

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
}: {
  token: string;
  pdfUrl: string;
  pageCount: number;
  fields: FieldDraft[];
  initialValues: Record<string, string>;
  recipientName: string;
  formName: string;
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
  const { showToast } = useToast();

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
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mb-3 text-5xl">✓</div>
        <h2 className="mb-2 text-xl font-bold text-slate-800">הטופס נשלח בהצלחה</h2>
        <p className="mb-5 text-slate-500">תודה {recipientName}. הטופס נשמר ונחתם.</p>
        <a
          href={`/api/download-completed?token=${encodeURIComponent(token)}`}
          className="inline-block w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-dark"
        >
          הורדת עותק חתום (PDF)
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">{formName}</h1>
        <p className="text-sm text-slate-500">
          שלום {recipientName}, אנא מלא/י את השדות וחתום/חתמי במקומות המסומנים.
        </p>
      </div>

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

      {/* סרגל שליחה קבוע בתחתית */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="text-sm text-slate-400">סך הכל {fields.length} שדות</p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-brand px-6 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
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
