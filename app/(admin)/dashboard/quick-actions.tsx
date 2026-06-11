"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NewFormModal } from "@/components/NewFormModal";

type FormOption = { id: string; name: string; page_count: number };
type FolderOption = { id: string; name: string };

export function QuickActions({ forms, folders }: { forms: FormOption[]; folders: FolderOption[] }) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <>
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center">
        <button onClick={() => setShowNewModal(true)} className="btn-primary-lg w-[200px]">
          <PlusIcon />
          יצירת טופס חדש
        </button>

        <button onClick={() => setShowPicker(true)} className="btn-secondary w-[200px]">
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

      <NewFormModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        forms={forms}
        folders={folders}
      />
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
  const [search, setSearch] = useState("");
  const filtered = forms.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel max-w-md">
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
          <>
            <div className="relative mb-3">
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                autoFocus
                placeholder="חיפוש לפי שם הטופס..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-paper-line bg-white py-1.5 pr-9 pl-3 text-sm text-paper-text placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="py-6 text-center text-paper-muted">לא נמצאו טפסים התואמים את החיפוש.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-paper-line rounded-xl border border-paper-line">
                {filtered.map((f) => (
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
          </>
        )}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
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
