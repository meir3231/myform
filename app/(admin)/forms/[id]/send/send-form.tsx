"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createSubmission, type SendActionState } from "../../actions";
import { FIELD_META } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";

export interface SendFormField {
  id: string;
  page: number;
  type: FieldType;
  label: string;
  required: boolean;
}

// סוגי שדות שניתן למלא מראש כטקסט (חתימה/ראשי תיבות לא ניתנים למילוי מראש)
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
}: {
  formId: string;
  fields: SendFormField[];
}) {
  const action = createSubmission.bind(null, formId);
  const [state, formAction] = useActionState<SendActionState, FormData>(action, {});
  const [copied, setCopied] = useState(false);

  const prefillable = fields.filter((f) => PREFILLABLE.includes(f.type));

  // הצלחה: התקבל לינק
  if (state.link) {
    return (
      <div className="page-fade-in card space-y-4 p-6">
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
          {state.emailSent
            ? "✓ הלינק נשלח במייל ללקוח."
            : "הלינק נוצר. שליחת המייל לא בוצעה" +
              (state.emailError ? ` (${state.emailError})` : "") +
              " — אפשר להעתיק ולשלוח ידנית."}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            לינק אישי ללקוח
          </label>
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
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="btn-secondary shrink-0 !px-3 !py-2"
            >
              {copied ? "הועתק ✓" : "העתקה"}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/submissions" className="btn-primary">
            למעקב הגשות
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            חזרה לטפסים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="page-fade-in card space-y-5 p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">שם הלקוח</label>
        <input
          name="recipient_name"
          type="text"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          אימייל הלקוח
        </label>
        <input
          name="recipient_email"
          type="email"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          תוקף הלינק (ימים)
        </label>
        <input
          name="expiry_days"
          type="number"
          min={1}
          max={90}
          defaultValue={14}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {prefillable.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">
            מילוי מקדים (אופציונלי)
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            ניתן למלא כאן בעצמכם שדות שכבר ידועים לכם — הלקוח יראה אותם ממולאים
            וימלא רק את השאר.
          </p>
          <div className="space-y-3">
            {prefillable.map((f) => (
              <div key={f.id}>
                <label className="mb-1 block text-xs text-slate-500">
                  {f.label}
                  <span
                    className="mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: FIELD_META[f.type].color }}
                  >
                    {FIELD_META[f.type].label} · עמ׳ {f.page}
                  </span>
                </label>
                <input
                  name={`prefill_${f.id}`}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
