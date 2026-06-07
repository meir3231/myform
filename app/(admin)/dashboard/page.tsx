import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { DeleteFormButton } from "./delete-form-button";

export default async function DashboardPage() {
  const { supabase } = await requireProfile();

  const { data: forms } = await supabase
    .from("forms")
    .select("id, name, page_count, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">הטפסים שלי</h1>
        <Link
          href="/forms/new"
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
        >
          + טופס חדש
        </Link>
      </div>

      {!forms || forms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="mb-4 text-slate-500">עדיין אין טפסים. העלה PDF כדי להתחיל.</p>
          <Link
            href="/forms/new"
            className="inline-block rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
          >
            העלאת טופס ראשון
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-1 text-lg font-semibold text-slate-800">{form.name}</h2>
              <p className="mb-4 text-sm text-slate-500">
                {form.page_count} עמודים ·{" "}
                {new Date(form.created_at).toLocaleDateString("he-IL")}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link
                  href={`/forms/${form.id}/edit`}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
                >
                  עריכת שדות
                </Link>
                <Link
                  href={`/forms/${form.id}/send`}
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark"
                >
                  שליחה ללקוח
                </Link>
                <DeleteFormButton formId={form.id} formName={form.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
