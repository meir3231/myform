"use client";

import {
  useState, useEffect, useMemo, useRef, useTransition,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createFolder as svCreateFolder,
  renameFolder as svRenameFolder,
  deleteFolder as svDeleteFolder,
  moveFormToFolder as svMoveForm,
  duplicateForm as svDuplicate,
  renameForm as svRenameForm,
  mergeForms as svMergeForms,
} from "./actions";
import { deleteForm as svDeleteForm } from "@/app/(admin)/forms/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormRow = {
  id: string;
  name: string;
  page_count: number;
  is_reusable: boolean;
  archived_at: string | null;
  folder_id: string | null;
  created_at: string;
};

type FolderRow = { id: string; name: string; parent_id: string | null };

// ─── Main Component ────────────────────────────────────────────────────────────

export function TemplatesClient({
  forms,
  folders,
}: {
  forms: FormRow[];
  folders: FolderRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // View / filter / sort
  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "reusable" | "single_use">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tmpl-view");
    if (saved === "grid" || saved === "list") setView(saved as "list" | "grid");
  }, []);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ⋮ menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Move to folder dialog
  const [movingFormId, setMovingFormId] = useState<string | null>(null);

  // New form modal
  const [showNewModal, setShowNewModal] = useState(false);

  // Merge modal (0=closed, 1=select forms, 2=configure)
  const [mergeStep, setMergeStep] = useState(0);
  const [mergeSelectedIds, setMergeSelectedIds] = useState(new Set<string>());
  const [mergeName, setMergeName] = useState("");
  const [mergeIsReusable, setMergeIsReusable] = useState(true);
  const [mergeFolderId, setMergeFolderId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");

  // Folder management
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderValue, setRenamingFolderValue] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // Close ⋮ menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function handleDocClick(e: MouseEvent) {
      const t = e.target as Element;
      if (!t.closest("[data-form-menu]") && !t.closest("[data-form-menu-portal]")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [openMenuId]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Escape") {
        if (mergeStep > 0) { setMergeStep(0); return; }
        if (showNewModal) { setShowNewModal(false); return; }
        if (openMenuId) { setOpenMenuId(null); return; }
        if (movingFormId) { setMovingFormId(null); return; }
        if (renamingId) { setRenamingId(null); return; }
        return;
      }
      if (isInput) return;
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setShowNewModal(true);
      }
      if ((e.key === "f" || e.key === "F") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mergeStep, showNewModal, openMenuId, movingFormId, renamingId]);

  // Filtered + sorted forms
  const filteredForms = useMemo(() => {
    const q = search.toLowerCase();
    let result = forms.filter((f) => {
      if (selectedFolder !== null && f.folder_id !== selectedFolder) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      if (filter === "reusable" && !f.is_reusable) return false;
      if (filter === "single_use" && f.is_reusable) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "name_asc") return a.name.localeCompare(b.name, "he");
      if (sort === "name_desc") return b.name.localeCompare(a.name, "he");
      return 0;
    });
    return result;
  }, [forms, selectedFolder, search, filter, sort]);

  const folderCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of forms) if (f.folder_id) m.set(f.folder_id, (m.get(f.folder_id) ?? 0) + 1);
    return m;
  }, [forms]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleViewChange(v: "list" | "grid") {
    setView(v);
    localStorage.setItem("tmpl-view", v);
  }

  function handleStartRename(id: string, name: string) {
    setOpenMenuId(null);
    setRenamingId(id);
    setRenamingValue(name);
  }

  function handleRenameSubmit(id: string) {
    const v = renamingValue.trim();
    setRenamingId(null);
    if (!v) return;
    startTransition(async () => { await svRenameForm(id, v); router.refresh(); });
  }

  function handleDuplicate(id: string) {
    setOpenMenuId(null);
    startTransition(async () => { await svDuplicate(id); router.refresh(); });
  }

  function handleDelete(id: string) {
    setOpenMenuId(null);
    if (!confirm("למחוק טופס זה? לא ניתן לשחזר פעולה זו.")) return;
    startTransition(async () => {
      await svDeleteForm(id);
      router.refresh();
    });
  }

  function handleMoveOpen(id: string) {
    setOpenMenuId(null);
    setMovingFormId(id);
  }

  function handleMoveConfirm(folderId: string | null) {
    const id = movingFormId!;
    setMovingFormId(null);
    startTransition(async () => { await svMoveForm(id, folderId); router.refresh(); });
  }

  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    setNewFolderName("");
    setShowNewFolderInput(false);
    startTransition(async () => {
      const result = await svCreateFolder(name);
      if (result.error) { alert(result.error); return; }
      router.refresh();
    });
  }

  function handleDeleteFolder(id: string) {
    if (!confirm("למחוק תיקייה זו? הטפסים שבתוכה לא יימחקו.")) return;
    startTransition(async () => {
      await svDeleteFolder(id);
      if (selectedFolder === id) setSelectedFolder(null);
      router.refresh();
    });
  }

  function handleFolderRenameSubmit(id: string) {
    const name = renamingFolderValue.trim();
    setRenamingFolderId(null);
    if (!name) return;
    startTransition(async () => { await svRenameFolder(id, name); router.refresh(); });
  }

  function handleMergeToggle(id: string) {
    setMergeSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function handleMergeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mergeSelectedIds.size < 2) { setMergeError("יש לבחור לפחות 2 טפסים"); return; }
    if (!mergeName.trim()) { setMergeError("נא להזין שם לטופס הממוזג"); return; }
    setMerging(true);
    setMergeError("");
    const result = await svMergeForms(
      [...mergeSelectedIds],
      mergeName.trim(),
      mergeIsReusable,
      mergeFolderId ?? undefined
    );
    setMerging(false);
    if (result.ok && result.formId) {
      setMergeStep(0);
      setMergeSelectedIds(new Set());
      setMergeName("");
      router.push(`/forms/${result.formId}/edit`);
    } else {
      setMergeError(result.error ?? "שגיאה לא ידועה במיזוג");
    }
  }

  const currentFolderName = selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?.name
    : null;

  const isFiltered = search !== "" || filter !== "all" || selectedFolder !== null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-paper-text ml-2">תבניות</h1>

        {/* Search */}
        <div className="relative">
          <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-paper-line bg-white py-1.5 pr-9 pl-3 text-sm text-paper-text placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            style={{ minWidth: 180 }}
          />
        </div>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-9 rounded-lg border border-paper-line bg-white px-3 text-sm text-paper-text focus:border-brand focus:outline-none"
        >
          <option value="all">כל הסוגים</option>
          <option value="reusable">שימוש חוזר</option>
          <option value="single_use">חד-פעמי</option>
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-9 rounded-lg border border-paper-line bg-white px-3 text-sm text-paper-text focus:border-brand focus:outline-none"
        >
          <option value="newest">חדש לישן</option>
          <option value="oldest">ישן לחדש</option>
          <option value="name_asc">שם: א-ת</option>
          <option value="name_desc">שם: ת-א</option>
        </select>

        {/* View toggle */}
        <div className="flex overflow-hidden rounded-lg border border-paper-line">
          <button
            onClick={() => handleViewChange("list")}
            className={`flex h-9 w-9 items-center justify-center transition ${view === "list" ? "bg-brand text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            title="רשימה"
          >
            <ListViewIcon />
          </button>
          <button
            onClick={() => handleViewChange("grid")}
            className={`flex h-9 w-9 items-center justify-center transition ${view === "grid" ? "bg-brand text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            title="רשת"
          >
            <GridViewIcon />
          </button>
        </div>

        <div className="flex-1" />

        {/* New form button */}
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-new-form"
          title="טופס חדש (N)"
        >
          <span className="text-xl font-bold leading-none">+</span> טופס חדש
        </button>
      </div>

      {/* Layout: folder panel + content */}
      <div className="flex gap-4">
        {/* Folder panel */}
        <aside className="w-44 shrink-0">
          <div className="rounded-xl border border-paper-line bg-white p-2">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${selectedFolder === null ? "bg-brand/10 font-semibold text-brand" : "text-paper-text hover:bg-slate-50"}`}
            >
              <FolderIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="flex-1 truncate text-right">כל התבניות</span>
              <span className="text-xs text-slate-400">{forms.length}</span>
            </button>

            {folders.length > 0 && <div className="my-1.5 border-t border-paper-line" />}

            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                {renamingFolderId === folder.id ? (
                  <input
                    autoFocus
                    value={renamingFolderValue}
                    onChange={(e) => setRenamingFolderValue(e.target.value)}
                    onBlur={() => handleFolderRenameSubmit(folder.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFolderRenameSubmit(folder.id);
                      if (e.key === "Escape") setRenamingFolderId(null);
                    }}
                    className="w-full rounded-lg border border-brand px-2 py-1.5 text-sm focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    onDoubleClick={() => {
                      setRenamingFolderId(folder.id);
                      setRenamingFolderValue(folder.name);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${selectedFolder === folder.id ? "bg-brand/10 font-semibold text-brand" : "text-paper-text hover:bg-slate-50"}`}
                  >
                    <FolderIcon className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-right">{folder.name}</span>
                    <span className="text-xs text-slate-400">{folderCounts.get(folder.id) ?? 0}</span>
                  </button>
                )}
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="absolute left-0.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:text-red-500 group-hover:flex"
                  title="מחיקת תיקייה"
                >
                  <XSmallIcon />
                </button>
              </div>
            ))}

            <div className="mt-1.5 border-t border-paper-line pt-1.5">
              {showNewFolderInput ? (
                <form onSubmit={handleCreateFolder}>
                  <input
                    autoFocus
                    placeholder="שם תיקייה"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={() => { if (!newFolderName.trim()) setShowNewFolderInput(false); }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setShowNewFolderInput(false); setNewFolderName(""); }
                    }}
                    className="w-full rounded-lg border border-brand px-2 py-1.5 text-sm focus:outline-none"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-brand"
                >
                  <PlusSmallIcon />
                  תיקייה חדשה
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Forms area */}
        <div className="min-w-0 flex-1">
          {currentFolderName && (
            <div className="mb-3 flex items-center gap-1.5 text-sm text-paper-muted">
              <button onClick={() => setSelectedFolder(null)} className="hover:text-brand">כל התבניות</button>
              <span>/</span>
              <span className="font-medium text-paper-text">{currentFolderName}</span>
            </div>
          )}

          {filteredForms.length === 0 ? (
            <EmptyState
              hasAnyForms={forms.length > 0}
              isFiltered={isFiltered}
              onClearFilter={() => { setSearch(""); setFilter("all"); setSelectedFolder(null); }}
              onNewForm={() => setShowNewModal(true)}
            />
          ) : view === "list" ? (
            <ListView
              forms={filteredForms}
              folders={folders}
              renamingId={renamingId}
              renamingValue={renamingValue}
              renameInputRef={renameInputRef}
              openMenuId={openMenuId}
              isPending={isPending}
              onStartRename={handleStartRename}
              onRenameChange={setRenamingValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={() => setRenamingId(null)}
              onMenuToggle={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onMoveOpen={handleMoveOpen}
            />
          ) : (
            <GridView
              forms={filteredForms}
              folders={folders}
              renamingId={renamingId}
              renamingValue={renamingValue}
              renameInputRef={renameInputRef}
              openMenuId={openMenuId}
              isPending={isPending}
              onStartRename={handleStartRename}
              onRenameChange={setRenamingValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={() => setRenamingId(null)}
              onMenuToggle={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onMoveOpen={handleMoveOpen}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewModal && (
        <NewFormModal
          onUploadClick={() => setShowNewModal(false)}
          onMergeClick={() => { setShowNewModal(false); setMergeStep(1); }}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {mergeStep > 0 && (
        <MergeModal
          step={mergeStep}
          allForms={forms.filter((f) => !f.archived_at)}
          folders={folders}
          selectedIds={mergeSelectedIds}
          name={mergeName}
          isReusable={mergeIsReusable}
          folderId={mergeFolderId}
          error={mergeError}
          merging={merging}
          onToggleForm={handleMergeToggle}
          onNextStep={() => {
            if (mergeSelectedIds.size < 2) { setMergeError("יש לבחור לפחות 2 טפסים"); return; }
            setMergeError("");
            setMergeStep(2);
          }}
          onNameChange={setMergeName}
          onIsReusableChange={setMergeIsReusable}
          onFolderChange={setMergeFolderId}
          onSubmit={handleMergeSubmit}
          onBack={() => { setMergeStep(1); setMergeError(""); }}
          onClose={() => { setMergeStep(0); setMergeSelectedIds(new Set()); setMergeError(""); }}
        />
      )}

      {movingFormId && (
        <MoveFolderModal
          folders={folders}
          currentFolderId={forms.find((f) => f.id === movingFormId)?.folder_id ?? null}
          onConfirm={handleMoveConfirm}
          onClose={() => setMovingFormId(null)}
        />
      )}
    </div>
  );
}

// ─── ListView ─────────────────────────────────────────────────────────────────

function ListView({
  forms, folders, renamingId, renamingValue, renameInputRef,
  openMenuId, isPending, onStartRename,
  onRenameChange, onRenameSubmit, onRenameCancel, onMenuToggle,
  onDuplicate, onDelete, onMoveOpen,
}: {
  forms: FormRow[];
  folders: FolderRow[];
  renamingId: string | null;
  renamingValue: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  openMenuId: string | null;
  isPending: boolean;
  onStartRename: (id: string, name: string) => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onMenuToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveOpen: (id: string) => void;
}) {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  return (
    <div className="card">
      <table className="w-full text-right text-sm">
        <thead className="text-paper-muted">
          <tr>
            <th className="px-4 py-3 font-medium">שם הטופס</th>
            <th className="px-4 py-3 font-medium">עמ׳</th>
            <th className="px-4 py-3 font-medium">סוג</th>
            <th className="px-4 py-3 font-medium">תיקייה</th>
            <th className="px-4 py-3 font-medium">נוצר</th>
            <th className="w-8 px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-line">
          {forms.map((form) => (
            <tr
              key={form.id}
              className="stagger-item transition hover:bg-brand/5"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <FormSmallIcon />
                  </span>
                  {renamingId === form.id ? (
                    <input
                      ref={renameInputRef}
                      value={renamingValue}
                      onChange={(e) => onRenameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onRenameSubmit(form.id);
                        if (e.key === "Escape") onRenameCancel();
                      }}
                      onBlur={() => onRenameSubmit(form.id)}
                      className="rounded border border-brand px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
                      style={{ minWidth: 160 }}
                    />
                  ) : (
                    <span
                      className="font-medium text-paper-text cursor-default select-none"
                      onDoubleClick={() => onStartRename(form.id, form.name)}
                      title="לחץ פעמיים לשינוי שם"
                    >
                      {form.name}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-paper-muted">{form.page_count}</td>
              <td className="px-4 py-3">
                <TypeBadge form={form} />
              </td>
              <td className="px-4 py-3 text-xs text-paper-muted">
                {form.folder_id ? (folderMap.get(form.folder_id) ?? "—") : "—"}
              </td>
              <td className="px-4 py-3 text-paper-muted">
                {new Date(form.created_at).toLocaleDateString("he-IL")}
              </td>
              <td className="relative px-2 py-3">
                <FormMenu
                  form={form}
                  isOpen={openMenuId === form.id}
                  isPending={isPending}
                  onToggle={() => onMenuToggle(form.id)}
                  onDuplicate={() => onDuplicate(form.id)}
                  onRename={() => onStartRename(form.id, form.name)}
                  onMove={() => onMoveOpen(form.id)}
                  onDelete={() => onDelete(form.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── GridView ─────────────────────────────────────────────────────────────────

function GridView({
  forms, folders, renamingId, renamingValue, renameInputRef,
  openMenuId, isPending, onStartRename, onRenameChange,
  onRenameSubmit, onRenameCancel, onMenuToggle, onDuplicate, onDelete, onMoveOpen,
}: {
  forms: FormRow[];
  folders: FolderRow[];
  renamingId: string | null;
  renamingValue: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  openMenuId: string | null;
  isPending: boolean;
  onStartRename: (id: string, name: string) => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onMenuToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveOpen: (id: string) => void;
}) {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {forms.map((form) => (
        <div
          key={form.id}
          className="card card-hover stagger-item relative flex flex-col p-5"
        >
          <div className="mb-3 flex items-start gap-3 pe-1">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <FormSmallIcon />
            </span>
            <div className="min-w-0 flex-1">
              {renamingId === form.id ? (
                <input
                  ref={renameInputRef}
                  value={renamingValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRenameSubmit(form.id);
                    if (e.key === "Escape") onRenameCancel();
                  }}
                  onBlur={() => onRenameSubmit(form.id)}
                  className="w-full rounded border border-brand px-2 py-0.5 text-sm font-semibold focus:outline-none"
                />
              ) : (
                <h2
                  className="truncate text-base font-semibold text-paper-text cursor-default select-none"
                  onDoubleClick={() => onStartRename(form.id, form.name)}
                  title="לחץ פעמיים לשינוי שם"
                >
                  {form.name}
                </h2>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                <TypeBadge form={form} />
              </div>
              <p className="mt-1 text-xs text-paper-muted">
                {form.page_count} עמ׳
                {form.folder_id ? ` · ${folderMap.get(form.folder_id) ?? ""}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2 border-t border-paper-line pt-3">
            <Link href={`/forms/${form.id}/edit`} className="btn-ghost !py-1 !px-2.5 !text-xs">
              עריכת שדות
            </Link>
            {!form.archived_at && (
              <Link href={`/forms/${form.id}/send`} className="btn-primary !py-1 !px-2.5 !text-xs">
                שליחה
              </Link>
            )}
            <span className="mr-auto">
              <FormMenu
                form={form}
                isOpen={openMenuId === form.id}
                isPending={isPending}
                onToggle={() => onMenuToggle(form.id)}
                onDuplicate={() => onDuplicate(form.id)}
                onRename={() => onStartRename(form.id, form.name)}
                onMove={() => onMoveOpen(form.id)}
                onDelete={() => onDelete(form.id)}
              />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FormMenu (⋮) ─────────────────────────────────────────────────────────────

function FormMenu({
  form, isOpen, isPending, onToggle, onDuplicate, onRename, onMove, onDelete,
}: {
  form: FormRow;
  isOpen: boolean;
  isPending: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  function handleToggle() {
    if (!isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left });
    }
    onToggle();
  }

  const dropdown = isOpen && menuPos ? createPortal(
    <div
      className="fixed z-[9999] w-44 overflow-hidden rounded-xl border border-paper-line bg-white py-1 shadow-xl"
      style={{ top: menuPos.top, left: menuPos.left }}
      data-form-menu-portal
    >
      <Link
        href={`/forms/${form.id}/edit`}
        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
      >
        <EditPenIcon /> עריכת שדות
      </Link>
      {!form.archived_at && (
        <Link
          href={`/forms/${form.id}/send`}
          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
        >
          <SendArrowIcon /> שליחה ללקוח
        </Link>
      )}
      <div className="my-1 border-t border-paper-line" />
      <button
        onClick={onDuplicate}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
      >
        <CopyIcon /> שכפול
      </button>
      <button
        onClick={onRename}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
      >
        <PenIcon /> שינוי שם
      </button>
      <button
        onClick={onMove}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
      >
        <FolderIcon className="h-4 w-4" /> העברה לתיקייה
      </button>
      <div className="my-1 border-t border-paper-line" />
      <button
        onClick={onDelete}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 transition hover:bg-red-50"
      >
        <TrashIcon /> מחיקה
      </button>
    </div>,
    document.body
  ) : null;

  return (
    <div data-form-menu>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); handleToggle(); }}
        disabled={isPending}
        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        title="פעולות"
      >
        <DotsVerticalIcon />
      </button>
      {dropdown}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function Modal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-paper-text">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NewFormModal({
  onUploadClick,
  onMergeClick,
  onClose,
}: {
  onUploadClick: () => void;
  onMergeClick: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="טופס חדש" onClose={onClose}>
      <p className="mb-5 text-sm text-paper-muted">בחר כיצד לייצור את הטופס החדש:</p>
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/forms/new"
          onClick={onUploadClick}
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
          onClick={onMergeClick}
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

function MergeModal({
  step, allForms, folders, selectedIds, name, isReusable, folderId, error, merging,
  onToggleForm, onNextStep, onNameChange, onIsReusableChange, onFolderChange,
  onSubmit, onBack, onClose,
}: {
  step: number;
  allForms: FormRow[];
  folders: FolderRow[];
  selectedIds: Set<string>;
  name: string;
  isReusable: boolean;
  folderId: string | null;
  error: string;
  merging: boolean;
  onToggleForm: (id: string) => void;
  onNextStep: () => void;
  onNameChange: (v: string) => void;
  onIsReusableChange: (v: boolean) => void;
  onFolderChange: (v: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const orderedIds = [...selectedIds];
  const selectedFormsList = allForms.filter((f) => selectedIds.has(f.id));
  const totalPages = selectedFormsList.reduce((acc, f) => acc + f.page_count, 0);

  return (
    <Modal title="מיזוג טפסים" onClose={onClose}>
      {/* Steps indicator */}
      <div className="mb-5 flex items-center gap-2 text-sm">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step >= 1 ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}>1</span>
        <span className={step >= 1 ? "text-paper-text" : "text-paper-muted"}>בחירת טפסים</span>
        <span className="h-px w-6 bg-slate-200" />
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step >= 2 ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}>2</span>
        <span className={step >= 2 ? "text-paper-text" : "text-paper-muted"}>הגדרות</span>
      </div>

      {step === 1 && (
        <div>
          <p className="mb-3 text-sm text-paper-muted">בחר לפחות 2 טפסים (הסדר קובע את סדר הדפים):</p>
          <div className="max-h-60 overflow-y-auto divide-y divide-paper-line rounded-xl border border-paper-line">
            {allForms.map((form) => (
              <label key={form.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-brand/5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(form.id)}
                  onChange={() => onToggleForm(form.id)}
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
            <button onClick={onClose} className="btn-secondary">ביטול</button>
            <button
              onClick={onNextStep}
              disabled={selectedIds.size < 2}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              הבא ←
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-paper-text">שם הטופס הממוזג</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
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
                      onChange={() => onIsReusableChange(val)}
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
                  onChange={(e) => onFolderChange(e.target.value || null)}
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
            <button type="button" onClick={onBack} className="btn-secondary">← חזרה</button>
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

function MoveFolderModal({
  folders,
  currentFolderId,
  onConfirm,
  onClose,
}: {
  folders: FolderRow[];
  currentFolderId: string | null;
  onConfirm: (folderId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="העברה לתיקייה" onClose={onClose}>
      <div className="divide-y divide-paper-line overflow-hidden rounded-xl border border-paper-line">
        {[{ id: null as string | null, name: "ללא תיקייה" }, ...folders].map((f) => (
          <button
            key={f.id ?? "__none"}
            onClick={() => onConfirm(f.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-brand/5 ${currentFolderId === f.id ? "bg-brand/5 font-medium text-brand" : "text-paper-text"}`}
          >
            <FolderIcon className="h-4 w-4 text-slate-400" />
            {f.name}
            {currentFolderId === f.id && <span className="mr-auto text-xs text-brand">✓</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="btn-secondary">ביטול</button>
      </div>
    </Modal>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  hasAnyForms,
  isFiltered,
  onClearFilter,
  onNewForm,
}: {
  hasAnyForms: boolean;
  isFiltered: boolean;
  onClearFilter: () => void;
  onNewForm: () => void;
}) {
  if (isFiltered) {
    return (
      <div className="card border-dashed p-12 text-center">
        <p className="mb-4 text-paper-muted">לא נמצאו תבניות התואמות את החיפוש.</p>
        <button onClick={onClearFilter} className="btn-secondary">נקה סינון</button>
      </div>
    );
  }
  return (
    <div className="card border-dashed p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
        <FormSmallIcon />
      </div>
      <p className="mb-4 text-paper-muted">
        {hasAnyForms ? "אין תבניות בתיקייה זו." : "עדיין אין תבניות. העלה PDF כדי להתחיל."}
      </p>
      {!hasAnyForms && (
        <button onClick={onNewForm} className="btn-primary inline-flex">
          העלאת טופס ראשון
        </button>
      )}
    </div>
  );
}

// ─── TypeBadge ───────────────────────────────────────────────────────────────

function TypeBadge({ form }: { form: FormRow }) {
  if (form.archived_at) return <span className="badge bg-slate-100 text-slate-500">הושבתה</span>;
  if (form.is_reusable) return <span className="badge bg-brand/10 text-brand">שימוש חוזר</span>;
  return <span className="badge bg-amber-100 text-amber-700">חד-פעמי</span>;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function FormSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M7 3.5h7l3 3V20a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.5V6a1 1 0 0 0 1 1h2.5M9 12h6M9 15h6M9 9h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "h-5 w-5"} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293L11.707 6.7A1 1 0 0 0 12.414 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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

function XSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ListViewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GridViewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function DotsVerticalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function EditPenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 12 20 4l-5 16-3-7-8-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
