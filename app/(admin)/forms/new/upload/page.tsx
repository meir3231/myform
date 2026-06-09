"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createForm, type FormActionState } from "../../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "מעלה..." : "העלאה והמשך לעורך"}
    </button>
  );
}

export default function NewFormUploadPage() {
  const [state, formAction] = useActionState<FormActionState, FormData>(createForm, {});

  return (
    <div className="page-fade-in mx-auto max-w-xl">
      <Breadcrumbs
        items={[
          { label: "תבניות", href: "/templates" },
          { label: "טופס חדש", href: "/forms/new" },
          { label: "העלאת PDF" },
        ]}
      />
      <h1 className="mb-6 text-2xl font-bold text-slate-800">העלאת קובץ PDF</h1>

      <form action={formAction} className="card space-y-5 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">שם הטופס</label>
          <input
            name="name"
            type="text"
            required
            placeholder="למשל: ייפוי כוח"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">קובץ PDF</label>
          <input
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:font-medium file:text-brand"
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-slate-700">סוג התבנית</legend>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-300 p-3 transition has-[:checked]:border-brand has-[:checked]:bg-brand/5">
              <input type="radio" name="usage_type" value="reusable" defaultChecked className="mt-1 accent-brand" />
              <span>
                <span className="block text-sm font-medium text-slate-700">תבנית לשימוש חוזר</span>
                <span className="block text-xs text-slate-500">ניתן לשלוח אותה ללקוחות שוב ושוב</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-300 p-3 transition has-[:checked]:border-brand has-[:checked]:bg-brand/5">
              <input type="radio" name="usage_type" value="single_use" className="mt-1 accent-brand" />
              <span>
                <span className="block text-sm font-medium text-slate-700">תבנית לשימוש חד-פעמי</span>
                <span className="block text-xs text-slate-500">תושבת אוטומטית לאחר שהגשה אחת תושלם</span>
              </span>
            </label>
          </div>
        </fieldset>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <SubmitButton />
      </form>
    </div>
  );
}
