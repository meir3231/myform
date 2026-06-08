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
        <Link href="/forms/new" className="btn-gold">
          <span className="text-base leading-none">+</span> טופס חדש
        </Link>
      </div>

      {!forms || forms.length === 0 ? (
        <div className="card border-dashed p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <FormIcon />
          </div>
          <p className="mb-4 text-slate-500">עדיין אין טפסים. העלה PDF כדי להתחיל.</p>
          <Link href="/forms/new" className="btn-primary inline-flex">
            העלאת טופס ראשון
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="card card-hover stagger-item flex flex-col p-5"
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <FormIcon />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-slate-800">
                    {form.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {form.page_count} עמודים ·{" "}
                    {new Date(form.created_at).toLocaleDateString("he-IL")}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <Link href={`/forms/${form.id}/edit`} className="btn-ghost">
                  עריכת שדות
                </Link>
                <Link href={`/forms/${form.id}/send`} className="btn-primary !px-3 !py-1.5">
                  שליחה ללקוח
                </Link>
                <span className="me-auto">
                  <DeleteFormButton formId={form.id} formName={form.name} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7 3.5h7l3 3V20a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V6a1 1 0 0 0 1 1h2.5M9 12h6M9 15h6M9 9h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
