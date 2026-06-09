"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FormOption = { id: string; name: string };

export function QuickActions({ forms }: { forms: FormOption[] }) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-paper-line bg-gradient-to-l from-brand/5 to-white p-5 sm:flex-row">
        <Link
          href="/forms/new"
          className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-brand px-6 py-4 text-base font-semibold text-white shadow-md transition hover:bg-brand-dark hover:shadow-lg"
          style={{ boxShadow: "0 4px 18px rgba(41,181,168,0.35)" }}
        >
          <PlusIcon />
          יצירת טופס חדש
        </Link>

        <button
          onClick={() => setShowPicker(true)}
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-brand px-6 py-4 text-base font-semibold text-brand transition hover:bg-brand/10"
        >
          <SendIcon />
          שליחת טופס ללקוח
        </button>
      </div>

      {showPicker && (
        <FormPickerModal
          forms={forms}
          onSelect={(id) => { setShowPicker(false); router.push(`/forms/${id}/send`); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

function FormPickerModal({
  forms,
  onSelect,
  onClose,
}: {
  forms: FormOption[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-paper-text">בחר טופס לשליחה</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <XIcon />
          </button>
        </div>

        {forms.length === 0 ? (
          <p className="py-6 text-center text-paper-muted">אין טפסים זמינים לשליחה.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-paper-line rounded-xl border border-paper-line">
            {forms.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelect(f.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-right text-sm transition hover:bg-brand/5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <FormSmallIcon />
                </span>
                <span className="flex-1 truncate font-medium text-paper-text">{f.name}</span>
                <span className="shrink-0 text-slate-400">←</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path d="M4 12 20 4l-5 16-3-7-8-1Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FormSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M7 3.5h7l3 3V20a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.5V6a1 1 0 0 0 1 1h2.5M9 12h6M9 15h6M9 9h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
