"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NewFormModal } from "@/components/NewFormModal";
import { Stepper } from "@/components/Stepper";

type FormOption = { id: string; name: string; page_count: number; folder_id: string | null };
type FolderOption = { id: string; name: string };

export function QuickActions({ forms, folders, canEdit }: { forms: FormOption[]; folders: FolderOption[]; canEdit: boolean }) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  if (!canEdit) return null;

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
          folders={folders}
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
  folders,
  onSelect,
  onClose,
}: {
  forms: FormOption[];
  folders: FolderOption[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = forms.filter((f) => {
    if (categoryId !== "all" && (f.folder_id ?? "") !== categoryId) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel w-[700px] max-w-full px-7 py-6">
        <div className="mb-4 flex h-11 items-center justify-between">
          <h2 className="text-[26px] font-bold text-paper-text">בחר טופס לשליחה</h2>
          <button onClick={onClose} className="btn-icon">
            <XIcon />
          </button>
        </div>

        <div className="mb-4 border-b border-soft-border pb-4">
          <Stepper current={1} />
        </div>

        {forms.length === 0 ? (
          <p className="py-6 text-center text-paper-muted">אין טפסים זמינים לשליחה.</p>
        ) : (
          <>
            <div className="mb-3 flex gap-3">
              <div className="relative w-[420px] max-w-full">
                <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  placeholder="חיפוש לפי שם הטופס..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pr-10"
                />
              </div>
              {folders.length > 0 && (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="select-field w-[200px] shrink-0"
                >
                  <option value="all">כל הקטגוריות</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="w-[644px] max-w-full overflow-y-auto rounded-xl border border-border" style={{ maxHeight: 300 }}>
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-paper-muted">לא נמצאו טפסים התואמים את החיפוש.</p>
              ) : (
                filtered.map((f, i) => {
                  const selected = selectedId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className={`flex h-12 w-full items-center gap-3 px-4 text-right text-sm transition ${
                        i > 0 ? "border-t border-soft-border" : ""
                      } ${selected ? "bg-brand-light shadow-[inset_0_0_0_1px_#14B8A6]" : "hover:bg-background"}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <FormSmallIcon />
                      </span>
                      <span className="flex-1 truncate font-medium text-paper-text">{f.name}</span>
                      <span className="shrink-0 text-xs text-text-secondary">{f.page_count} עמ׳</span>
                      {selected ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                          <CheckIcon />
                        </span>
                      ) : (
                        <span className="h-5 w-5 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="mt-4 flex h-11 items-center justify-between">
          <button onClick={onClose} className="btn-outline h-11 w-24 min-w-0">ביטול</button>
          <button
            onClick={() => selectedId && onSelect(selectedId)}
            disabled={!selectedId}
            className="btn-primary h-11 w-[110px] min-w-0"
          >
            המשך
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
