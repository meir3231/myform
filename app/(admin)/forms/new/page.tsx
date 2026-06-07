"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createForm, type FormActionState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? "מעלה..." : "העלאה והמשך לעורך"}
    </button>
  );
}

export default function NewFormPage() {
  const [state, formAction] = useActionState<FormActionState, FormData>(createForm, {});

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-slate-500 hover:text-brand">
        → חזרה לטפסים
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">טופס חדש</h1>

      <form action={formAction} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">שם הטופס</label>
          <input
            name="name"
            type="text"
            required
            placeholder="למשל: ייפוי כוח"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">קובץ PDF</label>
          <input
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-slate-700"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <SubmitButton />
      </form>
    </div>
  );
}
