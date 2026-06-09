import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function NewFormPage() {
  return (
    <div className="page-fade-in mx-auto max-w-xl">
      <Breadcrumbs items={[{ label: "תבניות", href: "/templates" }, { label: "טופס חדש" }]} />
      <h1 className="mb-2 text-2xl font-bold text-slate-800">טופס חדש</h1>
      <p className="mb-8 text-sm text-slate-500">בחר כיצד תרצה ליצור את הטופס</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/forms/new/upload"
          className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-paper-line bg-white p-6 text-center transition hover:border-brand hover:shadow-md"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
            <UploadIcon />
          </span>
          <div>
            <p className="font-semibold text-slate-800">העלאת קובץ PDF</p>
            <p className="mt-1 text-xs text-slate-500">העלה קובץ PDF מהמחשב שלך</p>
          </div>
        </Link>

        <Link
          href="/templates"
          className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-paper-line bg-white p-6 text-center transition hover:border-brand hover:shadow-md"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition group-hover:bg-brand group-hover:text-white">
            <CopyIcon />
          </span>
          <div>
            <p className="font-semibold text-slate-800">מתבנית קיימת</p>
            <p className="mt-1 text-xs text-slate-500">שכפל טופס קיים ובצע בו שינויים</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
