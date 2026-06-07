"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createSubmission, type SendActionState } from "../../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? "שולח..." : "יצירת לינק ושליחה"}
    </button>
  );
}

export function SendForm({ formId }: { formId: string }) {
  const action = createSubmission.bind(null, formId);
  const [state, formAction] = useActionState<SendActionState, FormData>(action, {});
  const [copied, setCopied] = useState(false);

  // הצלחה: התקבל לינק
  if (state.link) {
    return (
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
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
              className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
            >
              {copied ? "הועתק ✓" : "העתקה"}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/submissions"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            למעקב הגשות
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            חזרה לטפסים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">שם הלקוח</label>
        <input
          name="recipient_name"
          type="text"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
