"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createSubmission, type SendActionState } from "../../actions";
import { FIELD_META } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import { SendPreviewLoader } from "@/components/pdf-editor/SendPreviewLoader";
import { useToast } from "@/components/Toast";

export interface SendFormField {
  id: string;
  page: number;
  type: FieldType;
  label: string;
  required: boolean;
}

const PREFILLABLE: FieldType[] = ["text", "number", "date"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "שולח..." : "יצירת לינק ושליחה"}
    </button>
  );
}

export function SendForm({
  formId,
  fields,
  pdfUrl,
  pageCount,
}: {
  formId: string;
  fields: SendFormField[];
  pdfUrl: string;
  pageCount: number;
}) {
  const action = createSubmission.bind(null, formId);
  const [state, formAction] = useActionState<SendActionState, FormData>(action, {});
  const { showToast } = useToast();

  const prefillable = fields.filter((f) => PREFILLABLE.includes(f.type));

  if (state.link) {
    return (
      <div className="page-fade-in card mx-auto max-w-xl space-y-4 p-6">
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
          {state.emailSent
            ? "✓ הלינק נשלח במייל ללקוח."
            : "הלינק נוצר. שליחת המייל לא בוצעה" +
              (state.emailError ? ` (${state.emailError})` : "") +
              " — אפשר להעתיק ולשלוח ידנית."}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">לינק אישי ללקוח</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={state.link}
              dir="ltr"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(state.link!);
                showToast("הלינק הועתק ללוח", "success");
              }}
              className="btn-secondary shrink-0 !px-3 !py-2"
            >
              העתקה
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/submissions" className="btn-primary">למעקב הגשות</Link>
          <Link href="/templates" className="btn-secondary">חזרה לתבניות</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-0 lg:grid-cols-[1fr_380px]"
      style={{ height: "calc(100vh - 180px)" }}
    >
      {/* Left: PDF preview — full-height scrollable */}
      <div className="order-2 lg:order-1 hidden lg:block h-full overflow-hidden border-l border-paper-line bg-slate-50">
        <SendPreviewLoader pdfUrl={pdfUrl} pageCount={pageCount} />
      </div>

      {/* Right: form — split into client info (fixed) + prefill (scrollable) */}
      <div className="order-1 lg:order-2 flex h-full flex-col overflow-hidden border-paper-line">
        {/* Client details — fixed, no scroll */}
        <form
          id="send-form"
          action={formAction}
          className="flex flex-col overflow-hidden"
          style={{ height: "100%" }}
        >
          <div className="shrink-0 space-y-4 overflow-y-auto border-b border-paper-line bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-700">פרטי הלקוח</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">שם הלקוח</label>
              <input
                name="recipient_name"
                type="text"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">אימייל הלקוח</label>
              <input
                name="recipient_email"
                type="email"
                required
                dir="ltr"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">תוקף הלינק (ימים)</label>
              <input
                name="expiry_days"
                type="number"
                min={1}
                max={90}
                defaultValue={14}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          {/* Prefill section — independently scrollable */}
          {prefillable.length > 0 && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/60">
              <div className="shrink-0 border-b border-paper-line bg-white px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-700">מילוי מקדים (אופציונלי)</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  ניתן למלא כאן שדות שכבר ידועים לכם — הלקוח יראה אותם ממולאים.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-2">
                  {prefillable.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white"
                        style={{ backgroundColor: FIELD_META[f.type].color }}
                      >
                        {FIELD_META[f.type].label[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-600">
                          {f.label}
                          <span className="font-normal text-slate-400"> · עמ׳ {f.page}</span>
                        </p>
                        <input
                          name={`prefill_${f.id}`}
                          type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                          className={`mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${
                            f.type === "text" ? "text-right" : ""
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submit — pinned at bottom */}
          <div className="shrink-0 border-t border-paper-line bg-white p-4">
            {state.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
