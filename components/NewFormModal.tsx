"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { mergeForms as svMergeForms } from "@/app/(admin)/templates/actions";

type MergeFormOption = { id: string; name: string; page_count: number };
type FolderOption = { id: string; name: string };

export function NewFormModal({
  open,
  onClose,
  forms,
  folders,
}: {
  open: boolean;
  onClose: () => void;
  forms: MergeFormOption[];
  folders: FolderOption[];
}) {
  const router = useRouter();

  // Merge sub-flow (1=select forms, 2=configure)
  const [mergeStep, setMergeStep] = useState<0 | 1 | 2>(0);
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [name, setName] = useState("");
  const [isReusable, setIsReusable] = useState(true);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function reset() {
    setMergeStep(0);
    setSelectedIds(new Set());
    setName("");
    setIsReusable(true);
    setFolderId(null);
    setMerging(false);
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleToggleForm(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size < 2) { setError("יש לבחור לפחות 2 טפסים"); return; }
    if (!name.trim()) { setError("נא להזין שם לטופס הממוזג"); return; }
    setMerging(true);
    setError("");
    const result = await svMergeForms([...selectedIds], name.trim(), isReusable, folderId ?? undefined);
    setMerging(false);
    if (result.ok && result.formId) {
      reset();
      onClose();
      router.push(`/forms/${result.formId}/edit`);
    } else {
      setError(result.error ?? "שגיאה לא ידועה במיזוג");
    }
  }

  if (mergeStep === 0) {
    return (
      <Modal title="טופס חדש" onClose={handleClose}>
        <p className="mb-5 text-sm text-paper-muted">בחר כיצד לייצור את הטופס החדש:</p>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/forms/new/upload"
            onClick={handleClose}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-paper-line p-5 text-center transition hover:border-brand hover:bg-brand/5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <UploadIcon />
            </span>
            <div>
              <div className="font-semibold text-paper-text">העלאת PDF</div>
              <div className="mt-1 text-xs text-paper-muted">העלה קובץ PDF חדש</div>
            </div>
          </Link>
          <button
            onClick={() => setMergeStep(1)}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-paper-line p-5 text-center transition hover:border-brand hover:bg-brand/5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <MergeIcon />
            </span>
            <div>
              <div className="font-semibold text-paper-text">מיזוג טפסים קיימים</div>
              <div className="mt-1 text-xs text-paper-muted">שלב מספר טפסים לאחד</div>
            </div>
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">קיצור מקלדת: N | Esc לסגירה</p>
      </Modal>
    );
  }

  const orderedIds = [...selectedIds];
  const selectedFormsList = forms.filter((f) => selectedIds.has(f.id));
  const totalPages = selectedFormsList.reduce((acc, f) => acc + f.page_count, 0);

  return (
    <Modal title="מיזוג טפסים" onClose={handleClose}>
      {/* Steps indicator */}
      <div className="mb-5 flex items-center gap-2 text-sm">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${mergeStep >= 1 ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}>1</span>
        <span className={mergeStep >= 1 ? "text-paper-text" : "text-paper-muted"}>בחירת טפסים</span>
        <span className="h-px w-6 bg-slate-200" />
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${mergeStep >= 2 ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}>2</span>
        <span className={mergeStep >= 2 ? "text-paper-text" : "text-paper-muted"}>הגדרות</span>
      </div>

      {mergeStep === 1 && (
        <div>
          <p className="mb-3 text-sm text-paper-muted">בחר לפחות 2 טפסים (הסדר קובע את סדר הדפים):</p>
          <div className="max-h-60 overflow-y-auto divide-y divide-paper-line rounded-xl border border-paper-line">
            {forms.map((form) => (
              <label key={form.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-brand/5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(form.id)}
                  onChange={() => handleToggleForm(form.id)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-paper-text">{form.name}</div>
                  <div className="text-xs text-paper-muted">{form.page_count} עמ׳</div>
                </div>
                {selectedIds.has(form.id) && (
                  <span className="shrink-0 text-xs font-bold text-brand">
                    #{orderedIds.indexOf(form.id) + 1}
                  </span>
                )}
              </label>
            ))}
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-between">
            <button onClick={handleClose} className="btn-outline">ביטול</button>
            <button
              onClick={() => {
                if (selectedIds.size < 2) { setError("יש לבחור לפחות 2 טפסים"); return; }
                setError("");
                setMergeStep(2);
              }}
              disabled={selectedIds.size < 2}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              הבא ←
            </button>
          </div>
        </div>
      )}

      {mergeStep === 2 && (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-paper-text">שם הטופס הממוזג</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: חוזה שכירות + נספח"
                className="w-full rounded-lg border border-paper-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-paper-text">סוג תבנית</label>
              <div className="flex gap-5">
                {[{ val: true, label: "שימוש חוזר" }, { val: false, label: "חד-פעמי" }].map(({ val, label }) => (
                  <label key={String(val)} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={isReusable === val}
                      onChange={() => setIsReusable(val)}
                      className="accent-brand"
                    />
                    <span className="text-sm text-paper-text">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {folders.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-paper-text">תיקייה (אופציונלי)</label>
                <select
                  value={folderId ?? ""}
                  onChange={(e) => setFolderId(e.target.value || null)}
                  className="w-full rounded-lg border border-paper-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">ללא תיקייה</option>
                  {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
            {selectedIds.size} טפסים · סה"כ {totalPages} עמ׳ · שדות הטפסים יועתקו עם התאמת מספרי עמוד.
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-between">
            <button type="button" onClick={() => { setMergeStep(1); setError(""); }} className="btn-outline">← חזרה</button>
            <button type="submit" disabled={merging} className="btn-primary disabled:opacity-50">
              {merging ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ממזג...
                </span>
              ) : "צור טופס ממוזג"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MergeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
      <path d="M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3M16 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3M12 3v18M8 9l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
