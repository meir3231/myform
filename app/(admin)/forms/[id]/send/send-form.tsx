"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createSubmission, type SendActionState } from "../../actions";
import { FIELD_META } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import { SendPreviewLoader } from "@/components/pdf-editor/SendPreviewLoader";
import { Stepper } from "@/components/Stepper";
import { useToast } from "@/components/Toast";

export interface SendFormField {
  id: string;
  page: number;
  type: FieldType;
  label: string;
  required: boolean;
}

type Channel = "email" | "sms" | "whatsapp";

const PREFILLABLE: FieldType[] = ["text", "number", "date"];

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-primary h-11 w-[110px] min-w-0">
      המשך
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary h-11 min-w-[150px]">
      {pending ? "שולח..." : "שליחה ללקוח"}
    </button>
  );
}

export function SendForm({
  formId,
  formName,
  fields,
  pdfUrl,
  pageCount,
}: {
  formId: string;
  formName: string;
  fields: SendFormField[];
  pdfUrl: string;
  pageCount: number;
}) {
  const action = createSubmission.bind(null, formId);
  const [state, formAction] = useActionState<SendActionState, FormData>(action, {});
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<2 | 3>(2);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState(14);
  const [channel, setChannel] = useState<Channel>("email");

  const prefillable = fields.filter((f) => PREFILLABLE.includes(f.type));

  function goToStep3() {
    if (formRef.current && !formRef.current.reportValidity()) return;
    setStep(3);
  }

  if (state.link) {
    return (
      <div className="page-fade-in mx-auto flex max-w-xl flex-col gap-5 rounded-2xl border border-paper-line bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircleIcon />
          </span>
          <div>
            <h2 className="text-lg font-bold text-paper-text">הטופס נשלח בהצלחה</h2>
            <p className="text-sm text-paper-muted">
              {state.emailSent
                ? "הלינק נשלח במייל ללקוח."
                : "הלינק נוצר, אך שליחת המייל לא בוצעה" +
                  (state.emailError ? ` (${state.emailError})` : "") +
                  " — ניתן להעתיק ולשלוח ידנית."}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-paper-text">לינק אישי ללקוח</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={state.link}
              dir="ltr"
              className="input-field text-text-secondary"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(state.link!);
                showToast("הלינק הועתק ללוח", "success");
              }}
              className="btn-outline h-11 shrink-0 min-w-0 px-4"
            >
              <ClipboardIcon /> העתק קישור
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {state.submissionId && (
            <Link href={`/submissions/${state.submissionId}`} className="btn-primary">
              פתח הגשה
            </Link>
          )}
          <Link href={`/forms/${formId}/send`} className="btn-outline">
            שלח טופס נוסף
          </Link>
          <Link href="/templates" className="btn-ghost">
            חזרה לתבניות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full gap-3 lg:grid-cols-[420px_1fr]">
      {/* Left: wizard — recipient details (step 2) + confirmation (step 3) */}
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-paper-line shadow-sm">
        <div className="shrink-0 border-b border-paper-line px-5 py-3">
          <Stepper current={step} />
        </div>

        <form
          ref={formRef}
          action={formAction}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* ---- Step 2: פרטי הנמען ---- */}
          <div className={step === 2 ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}>
            <div className="shrink-0 border-b border-paper-line bg-slate-50/80 px-5 py-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">פרטי הנמען</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">שם הלקוח</label>
                  <input
                    name="recipient_name"
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">תוקף (ימים)</label>
                  <input
                    name="expiry_days"
                    type="number"
                    min={1}
                    max={90}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value) || 14)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">אימייל הלקוח</label>
                <input
                  name="recipient_email"
                  type="email"
                  required
                  dir="ltr"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Prefill — main scrollable section */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="shrink-0 border-b border-paper-line bg-white px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-700">מילוי מקדים</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {prefillable.length > 0
                    ? "שדות שכבר ידועים לכם — הלקוח יראה אותם ממולאים."
                    : "אין שדות הניתנים למילוי מקדים בטופס זה."}
                </p>
              </div>

              {prefillable.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {prefillable.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
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
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-slate-400">—</p>
                </div>
              )}
            </div>

            {/* Footer — h=64 */}
            <div className="flex h-16 shrink-0 items-center justify-between border-t border-paper-line bg-white px-5">
              <Link href="/templates" className="btn-outline h-11 w-24 min-w-0">ביטול</Link>
              <ContinueButton onClick={goToStep3} />
            </div>
          </div>

          {/* ---- Step 3: אישור ושליחה ---- */}
          <div className={step === 3 ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {/* סיכום */}
              <div className="rounded-xl border border-soft-border bg-slate-50/60 p-3 text-sm">
                <h2 className="mb-2 text-sm font-semibold text-slate-700">סיכום</h2>
                <dl className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">טופס</dt>
                    <dd className="truncate font-medium text-paper-text">{formName}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">נמען</dt>
                    <dd className="truncate font-medium text-paper-text">{recipientName || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">אימייל</dt>
                    <dd dir="ltr" className="truncate font-medium text-paper-text">{recipientEmail || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">תוקף קישור</dt>
                    <dd className="font-medium text-paper-text">{expiryDays} ימים</dd>
                  </div>
                  {prefillable.length > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">מילוי מקדים</dt>
                      <dd className="font-medium text-paper-text">{prefillable.length} שדות</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* ערוץ שליחה */}
              <div className="mt-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-700">ערוץ שליחה</h2>
                <div className="grid grid-cols-3 gap-2">
                  <ChannelOption
                    label="אימייל"
                    icon={<EmailIcon />}
                    selected={channel === "email"}
                    onClick={() => setChannel("email")}
                  />
                  <ChannelOption label="SMS" icon={<SmsIcon />} disabled comingSoon />
                  <ChannelOption label="WhatsApp" icon={<WhatsappIcon />} disabled comingSoon />
                </div>
              </div>

              {/* תצוגה מקדימה של ההודעה */}
              <div className="mt-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-700">תצוגה מקדימה של ההודעה</h2>
                <div className="rounded-xl border border-soft-border bg-white p-3 text-xs leading-relaxed text-slate-600">
                  <p>שלום {recipientName || "—"},</p>
                  <p className="mt-1">
                    התקבל עבורך טופס למילוי וחתימה: <span className="font-semibold text-paper-text">{formName}</span>.
                  </p>
                  <p className="mt-2 inline-block rounded-lg bg-brand px-3 py-1.5 font-semibold text-white">
                    פתיחת הטופס
                  </p>
                </div>
              </div>

              {state.error && <p className="alert-error mt-3">{state.error}</p>}
            </div>

            {/* Footer — h=64 */}
            <div className="flex h-16 shrink-0 items-center justify-between border-t border-paper-line bg-white px-5">
              <button type="button" onClick={() => setStep(2)} className="btn-outline h-11 w-24 min-w-0">
                חזרה
              </button>
              <SubmitButton />
            </div>
          </div>
        </form>
      </div>

      {/* Right: PDF preview — main area */}
      <div className="hidden h-full overflow-hidden rounded-2xl border border-paper-line bg-slate-50 shadow-sm lg:block">
        <SendPreviewLoader pdfUrl={pdfUrl} pageCount={pageCount} />
      </div>
    </div>
  );
}

function ChannelOption({
  label,
  icon,
  selected,
  disabled,
  comingSoon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium transition ${
        selected
          ? "border-brand bg-brand-light text-primary-dark"
          : disabled
          ? "cursor-not-allowed border-border bg-slate-50 text-text-secondary opacity-60"
          : "border-border bg-white text-navy hover:border-brand"
      }`}
    >
      {icon}
      {label}
      {comingSoon && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
          בקרוב
        </span>
      )}
    </button>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.3 11 15.3 16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="8" y="4" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 7v11a1.5 1.5 0 0 0 1.5 1.5H14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path d="M4 5h16v10H9l-4 4V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path d="M12 3a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.9-1.3A8.5 8.5 0 1 0 12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.4 0 .8-.4.8-.9l-.2-1-1.8-.6-.8.8a5 5 0 0 1-2.8-2.8l.8-.8-.6-1.8-1-.2c-.5 0-.9.4-.9.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
