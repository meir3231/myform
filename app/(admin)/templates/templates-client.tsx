"use client";

import {
  useState, useEffect, useMemo, useRef, useTransition,
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
  shareForm as svShareForm,
  unshareForm as svUnshareForm,
  getFormPreview,
} from "./actions";
import { deleteForm as svDeleteForm } from "@/app/(admin)/forms/actions";
import { PageHeading } from "@/components/PageHeading";
import { canEdit as canEditRole } from "@/lib/permissions";
import { Modal } from "@/components/Modal";
import { NewFormModal } from "@/components/NewFormModal";
import { TemplatePreviewPane, type TemplatePreviewData } from "@/components/pdf-filler/TemplatePreviewPane";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormRow = {
  id: string;
  name: string;
  page_count: number;
  is_reusable: boolean;
  archived_at: string | null;
  folder_id: string | null;
  created_at: string;
  visibility: string;
  created_by: string | null;
  creatorName: string | null;
  fieldCount: number;
};

type FolderRow = { id: string; name: string; parent_id: string | null };

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── Main Component ────────────────────────────────────────────────────────────

export function TemplatesClient({
  forms,
  folders,
  currentUserId,
  currentUserRole,
  initialPreviewFormId,
  initialPreviewData,
}: {
  forms: FormRow[];
  folders: FolderRow[];
  currentUserId: string;
  currentUserRole: string;
  initialPreviewFormId: string | null;
  initialPreviewData: TemplatePreviewData | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAdmin = currentUserRole === "admin";
  const canEdit = canEditRole(currentUserRole);

  // Search / filter / sort
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "reusable" | "single_use">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Pagination (admin list)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Preview pane state
  const [selectedFormId, setSelectedFormId] = useState<string | null>(initialPreviewFormId);
  const [previewCache, setPreviewCache] = useState<Map<string, TemplatePreviewData>>(() => {
    const m = new Map<string, TemplatePreviewData>();
    if (initialPreviewFormId && initialPreviewData) m.set(initialPreviewFormId, initialPreviewData);
    return m;
  });
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ⋮ menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Move to folder dialog
  const [movingFormId, setMovingFormId] = useState<string | null>(null);

  // Delete confirmation dialog
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);

  // New form modal
  const [showNewModal, setShowNewModal] = useState(false);

  // Folder dropdown + management
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderValue, setRenamingFolderValue] = useState("");

  // Filters popover
  const [showFilters, setShowFilters] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // Close ⋮ menu / folder dropdown / filters popover on outside click
  useEffect(() => {
    if (!openMenuId && !showFolderDropdown && !showFilters) return;
    function handleDocClick(e: MouseEvent) {
      const t = e.target as Element;
      if (openMenuId && !t.closest("[data-form-menu]") && !t.closest("[data-form-menu-portal]")) {
        setOpenMenuId(null);
      }
      if (showFolderDropdown && !t.closest("[data-folder-dropdown]")) {
        setShowFolderDropdown(false);
      }
      if (showFilters && !t.closest("[data-filters-popover]")) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [openMenuId, showFolderDropdown, showFilters]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Escape") {
        if (showNewModal) { setShowNewModal(false); return; }
        if (openMenuId) { setOpenMenuId(null); return; }
        if (showFolderDropdown) { setShowFolderDropdown(false); return; }
        if (showFilters) { setShowFilters(false); return; }
        if (movingFormId) { setMovingFormId(null); return; }
        if (deletingFormId) { setDeletingFormId(null); return; }
        if (renamingId) { setRenamingId(null); return; }
        return;
      }
      if (isInput) return;
      if (canEdit && (e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setShowNewModal(true);
      }
      if ((e.key === "f" || e.key === "F") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNewModal, openMenuId, showFolderDropdown, showFilters, movingFormId, deletingFormId, renamingId, canEdit]);

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

  // Reset to page 1 whenever the result set or page size changes
  useEffect(() => {
    setPage(1);
  }, [search, filter, sort, selectedFolder, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredForms.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedForms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredForms.slice(start, start + pageSize);
  }, [filteredForms, currentPage, pageSize]);

  // ─── Preview pane ───────────────────────────────────────────────────────────

  const activePreviewId = selectedFormId;

  // Keep selection valid if the underlying form list changes (e.g. after delete)
  useEffect(() => {
    if (selectedFormId && !forms.some((f) => f.id === selectedFormId)) {
      setSelectedFormId(forms[0]?.id ?? null);
    }
  }, [forms, selectedFormId]);

  // Lazily load preview data for the selected form
  useEffect(() => {
    const id = activePreviewId;
    if (!id) return;
    if (previewCache.has(id) || previewLoadingId === id) return;

    setPreviewLoadingId(id);
    getFormPreview(id).then((res) => {
      setPreviewLoadingId((cur) => (cur === id ? null : cur));
      if ("error" in res) return;
      setPreviewCache((prev) => {
        const next = new Map(prev);
        next.set(id, res);
        return next;
      });
    });
  }, [activePreviewId, previewCache, previewLoadingId]);

  const activeForm = forms.find((f) => f.id === activePreviewId) ?? null;
  const activePreviewData = activePreviewId ? previewCache.get(activePreviewId) ?? null : null;

  function handleRowClick(id: string) {
    setSelectedFormId(id);
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

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
    setDeletingFormId(id);
  }

  function handleDeleteConfirm() {
    const id = deletingFormId!;
    setDeletingFormId(null);
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

  function handleShare(id: string) {
    setOpenMenuId(null);
    startTransition(async () => { await svShareForm(id); router.refresh(); });
  }

  function handleUnshare(id: string) {
    setOpenMenuId(null);
    startTransition(async () => { await svUnshareForm(id); router.refresh(); });
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

  const isFiltered = search !== "" || filter !== "all" || selectedFolder !== null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeading title="תבניות" />
      <div className="mb-2 flex shrink-0 flex-wrap items-baseline justify-end gap-3">
        {canEdit && (
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary-lg w-[200px]"
            title="טופס חדש (N)"
          >
            <PlusIcon />
            טופס חדש
          </button>
        )}
      </div>

      {/* Layout: list panel (right) + preview pane (left) */}
      <div className="flex flex-1 min-h-0 gap-6 overflow-hidden">
        {/* List panel */}
        <aside className="flex w-[500px] shrink-0 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="mb-2 flex h-11 shrink-0 items-center gap-2">
            <FolderDropdown
              folders={folders}
              folderCounts={folderCounts}
              totalCount={forms.length}
              selectedFolder={selectedFolder}
              onSelectFolder={(id) => { setSelectedFolder(id); setShowFolderDropdown(false); }}
              open={showFolderDropdown}
              onToggle={() => setShowFolderDropdown((o) => !o)}
              canEdit={canEdit}
              showNewFolderInput={showNewFolderInput}
              setShowNewFolderInput={setShowNewFolderInput}
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              onCreateFolder={handleCreateFolder}
              renamingFolderId={renamingFolderId}
              renamingFolderValue={renamingFolderValue}
              setRenamingFolderId={setRenamingFolderId}
              setRenamingFolderValue={setRenamingFolderValue}
              onFolderRenameSubmit={handleFolderRenameSubmit}
              onDeleteFolder={handleDeleteFolder}
            />

            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="חיפוש תבניות..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !h-11 pr-10"
              />
            </div>

            <FiltersPopover
              filter={filter}
              setFilter={setFilter}
              sort={sort}
              setSort={setSort}
              open={showFilters}
              onToggle={() => setShowFilters((o) => !o)}
            />
          </div>

          {/* List (scroll) */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredForms.length === 0 ? (
              <EmptyState
                hasAnyForms={forms.length > 0}
                isFiltered={isFiltered}
                canEdit={canEdit}
                onClearFilter={() => { setSearch(""); setFilter("all"); setSelectedFolder(null); }}
                onNewForm={() => setShowNewModal(true)}
              />
            ) : !isAdmin ? (
              <MemberFormsView
                forms={filteredForms}
                folders={folders}
                currentUserId={currentUserId}
                canEdit={canEdit}
                renamingId={renamingId}
                renamingValue={renamingValue}
                renameInputRef={renameInputRef}
                openMenuId={openMenuId}
                isPending={isPending}
                selectedFormId={selectedFormId}
                onRowClick={handleRowClick}
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
              <ListView
                forms={pagedForms}
                folders={folders}
                isAdmin={isAdmin}
                canEdit={canEdit}
                renamingId={renamingId}
                renamingValue={renamingValue}
                renameInputRef={renameInputRef}
                openMenuId={openMenuId}
                isPending={isPending}
                selectedFormId={selectedFormId}
                onRowClick={handleRowClick}
                onStartRename={handleStartRename}
                onRenameChange={setRenamingValue}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={() => setRenamingId(null)}
                onMenuToggle={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onMoveOpen={handleMoveOpen}
                onShare={handleShare}
                onUnshare={handleUnshare}
              />
            )}
          </div>

          {/* Pagination */}
          {isAdmin && filteredForms.length > 0 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredForms.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </aside>

        {/* Preview pane */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <TemplatePreviewPane
            formId={activePreviewId}
            formName={activeForm?.name}
            data={activePreviewData}
            loading={previewLoadingId === activePreviewId}
          />
        </div>
      </div>

      {/* Modals */}
      <NewFormModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        forms={forms.filter((f) => !f.archived_at).map((f) => ({ id: f.id, name: f.name, page_count: f.page_count }))}
        folders={folders}
      />

      {movingFormId && (
        <MoveFolderModal
          folders={folders}
          currentFolderId={forms.find((f) => f.id === movingFormId)?.folder_id ?? null}
          onConfirm={handleMoveConfirm}
          onClose={() => setMovingFormId(null)}
        />
      )}

      {deletingFormId && (
        <DeleteFormModal
          formName={forms.find((f) => f.id === deletingFormId)?.name ?? ""}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingFormId(null)}
        />
      )}
    </div>
  );
}

// ─── ListView ─────────────────────────────────────────────────────────────────

function ListView({
  forms, folders, isAdmin, canEdit, renamingId, renamingValue, renameInputRef,
  openMenuId, isPending, selectedFormId, onRowClick, onStartRename,
  onRenameChange, onRenameSubmit, onRenameCancel, onMenuToggle,
  onDuplicate, onDelete, onMoveOpen, onShare, onUnshare,
}: {
  forms: FormRow[];
  folders: FolderRow[];
  isAdmin: boolean;
  canEdit: boolean;
  renamingId: string | null;
  renamingValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  openMenuId: string | null;
  isPending: boolean;
  selectedFormId: string | null;
  onRowClick: (id: string) => void;
  onStartRename: (id: string, name: string) => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onMenuToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveOpen: (id: string) => void;
  onShare: (id: string) => void;
  onUnshare: (id: string) => void;
}) {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="flex h-10 items-center gap-3 border-b border-paper-line px-3 text-xs font-medium text-paper-muted">
        <div className="min-w-0 flex-1">שם המסמך</div>
        <div className="w-20 shrink-0">יוצר</div>
        <div className="w-28 shrink-0">תיקייה</div>
        <div className="w-8 shrink-0" />
      </div>

      <div className="divide-y divide-paper-line">
        {forms.map((form) => (
          <div
            key={form.id}
            onClick={() => onRowClick(form.id)}
            className={`stagger-item flex h-16 cursor-pointer items-center gap-3 border-r-[3px] px-3 transition ${
              selectedFormId === form.id ? "border-r-brand bg-brand/5" : "border-r-transparent hover:bg-slate-50"
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <FormSmallIcon />
              </span>
              <div className="min-w-0">
                {renamingId === form.id ? (
                  <input
                    ref={renameInputRef}
                    value={renamingValue}
                    onChange={(e) => onRenameChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onRenameSubmit(form.id);
                      if (e.key === "Escape") onRenameCancel();
                    }}
                    onBlur={() => onRenameSubmit(form.id)}
                    className="w-full rounded border border-brand px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="truncate font-semibold text-paper-text cursor-default select-none"
                      onDoubleClick={canEdit ? () => onStartRename(form.id, form.name) : undefined}
                      title={form.name}
                    >
                      {form.name}
                    </span>
                    {form.visibility === "shared" && (
                      <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                        משותף
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-0.5 truncate text-xs text-paper-muted">
                  {form.page_count} עמ׳ · {form.fieldCount} שדות
                  {form.archived_at ? " · הושבתה" : !form.is_reusable ? " · חד-פעמי" : ""}
                </p>
              </div>
            </div>
            <div className="w-20 shrink-0 truncate text-sm text-text-secondary">{form.creatorName ?? "—"}</div>
            <div className="w-28 shrink-0">
              {form.folder_id ? (
                <span className="badge min-w-0 w-full justify-start gap-1 bg-slate-100 text-slate-600" title={folderMap.get(form.folder_id) ?? ""}>
                  <FolderIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{folderMap.get(form.folder_id) ?? "—"}</span>
                </span>
              ) : (
                <span className="text-sm text-text-secondary">—</span>
              )}
            </div>
            <div className="w-8 shrink-0">
              <FormMenu
                form={form}
                isAdmin={isAdmin}
                canEdit={canEdit}
                isOpen={openMenuId === form.id}
                isPending={isPending}
                onToggle={() => onMenuToggle(form.id)}
                onDuplicate={() => onDuplicate(form.id)}
                onRename={() => onStartRename(form.id, form.name)}
                onMove={() => onMoveOpen(form.id)}
                onShare={() => onShare(form.id)}
                onUnshare={() => onUnshare(form.id)}
                onDelete={() => onDelete(form.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MemberFormsView (split: mine + shared) ───────────────────────────────────

function MemberFormsView({
  forms, folders, currentUserId, canEdit,
  renamingId, renamingValue, renameInputRef, openMenuId, isPending,
  selectedFormId, onRowClick,
  onStartRename, onRenameChange, onRenameSubmit, onRenameCancel,
  onMenuToggle, onDuplicate, onDelete, onMoveOpen,
}: {
  forms: FormRow[];
  folders: FolderRow[];
  currentUserId: string;
  canEdit: boolean;
  renamingId: string | null;
  renamingValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  openMenuId: string | null;
  isPending: boolean;
  selectedFormId: string | null;
  onRowClick: (id: string) => void;
  onStartRename: (id: string, name: string) => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onMenuToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveOpen: (id: string) => void;
}) {
  const sharedForms = forms.filter((f) => f.visibility === "shared" && f.created_by !== currentUserId);
  const myForms = forms.filter((f) => f.created_by === currentUserId);

  const noOp = () => {};
  const sharedProps = {
    folders, isAdmin: false, canEdit,
    renamingId, renamingValue, renameInputRef, openMenuId, isPending,
    selectedFormId, onRowClick,
    onStartRename, onRenameChange, onRenameSubmit, onRenameCancel,
    onMenuToggle, onDuplicate, onDelete, onMoveOpen,
    onShare: noOp, onUnshare: noOp,
  };

  return (
    <div className="space-y-4">
      {myForms.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-600">הטפסים שלי</h2>
          <ListView forms={myForms} {...sharedProps} />
        </div>
      )}
      {sharedForms.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-600">טפסים משותפים</h2>
          <ListView forms={sharedForms} {...sharedProps} />
        </div>
      )}
      {myForms.length === 0 && sharedForms.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">אין טפסים להצגה</p>
      )}
    </div>
  );
}

// ─── FolderDropdown ─────────────────────────────────────────────────────────────

function FolderDropdown({
  folders, folderCounts, totalCount, selectedFolder, onSelectFolder, open, onToggle,
  showNewFolderInput, setShowNewFolderInput, newFolderName, setNewFolderName, onCreateFolder,
  renamingFolderId, renamingFolderValue, setRenamingFolderId, setRenamingFolderValue,
  onFolderRenameSubmit, onDeleteFolder, canEdit,
}: {
  folders: FolderRow[];
  folderCounts: Map<string, number>;
  totalCount: number;
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  open: boolean;
  onToggle: () => void;
  showNewFolderInput: boolean;
  setShowNewFolderInput: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  onCreateFolder: (e: React.FormEvent) => void;
  renamingFolderId: string | null;
  renamingFolderValue: string;
  setRenamingFolderId: (id: string | null) => void;
  setRenamingFolderValue: (v: string) => void;
  onFolderRenameSubmit: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  canEdit: boolean;
}) {
  const currentName = selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?.name ?? "כל התיקיות"
    : "כל התיקיות";

  return (
    <div className="relative shrink-0" data-folder-dropdown>
      <button
        onClick={onToggle}
        className="flex h-11 w-44 items-center justify-between gap-2 rounded-[10px] border border-border bg-white px-3 text-sm text-navy transition hover:border-brand"
      >
        <span className="truncate">{currentName}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-64 rounded-xl border border-paper-line bg-white p-2 shadow-xl">
          <button
            onClick={() => onSelectFolder(null)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${selectedFolder === null ? "bg-brand/10 font-semibold text-brand" : "text-paper-text hover:bg-slate-50"}`}
          >
            <FolderIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="flex-1 truncate text-right">כל התבניות</span>
            <span className="text-xs text-slate-400">{totalCount}</span>
          </button>

          {folders.length > 0 && <div className="my-1.5 border-t border-paper-line" />}

          {folders.map((folder) => (
            <div key={folder.id} className="group relative">
              {renamingFolderId === folder.id ? (
                <input
                  autoFocus
                  value={renamingFolderValue}
                  onChange={(e) => setRenamingFolderValue(e.target.value)}
                  onBlur={() => onFolderRenameSubmit(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onFolderRenameSubmit(folder.id);
                    if (e.key === "Escape") setRenamingFolderId(null);
                  }}
                  className="w-full rounded-lg border border-brand px-2 py-1.5 text-sm focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  onDoubleClick={canEdit ? () => {
                    setRenamingFolderId(folder.id);
                    setRenamingFolderValue(folder.name);
                  } : undefined}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${selectedFolder === folder.id ? "bg-brand/10 font-semibold text-brand" : "text-paper-text hover:bg-slate-50"}`}
                >
                  <FolderIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-right">{folder.name}</span>
                  <span className="text-xs text-slate-400">{folderCounts.get(folder.id) ?? 0}</span>
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => onDeleteFolder(folder.id)}
                  className="absolute left-0.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:text-red-500 group-hover:flex"
                  title="מחיקת תיקייה"
                >
                  <XSmallIcon />
                </button>
              )}
            </div>
          ))}

          {canEdit && (
            <div className="mt-1.5 border-t border-paper-line pt-1.5">
              {showNewFolderInput ? (
                <form onSubmit={onCreateFolder}>
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
          )}
        </div>
      )}
    </div>
  );
}

// ─── FiltersPopover ─────────────────────────────────────────────────────────────

function FiltersPopover({
  filter, setFilter, sort, setSort, open, onToggle,
}: {
  filter: "all" | "reusable" | "single_use";
  setFilter: (v: "all" | "reusable" | "single_use") => void;
  sort: "newest" | "oldest" | "name_asc" | "name_desc";
  setSort: (v: "newest" | "oldest" | "name_asc" | "name_desc") => void;
  open: boolean;
  onToggle: () => void;
}) {
  const isActive = filter !== "all" || sort !== "newest";

  return (
    <div className="relative shrink-0" data-filters-popover>
      <button
        onClick={onToggle}
        className="btn-icon !h-11 !w-11 relative"
        title="פילטרים"
      >
        <FilterIcon />
        {isActive && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-56 space-y-3 rounded-xl border border-paper-line bg-white p-3 shadow-xl">
          <div>
            <label className="mb-1 block text-xs font-medium text-paper-muted">סוג</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="select-field !h-10 w-full !text-sm"
            >
              <option value="all">כל הסוגים</option>
              <option value="reusable">שימוש חוזר</option>
              <option value="single_use">חד-פעמי</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-paper-muted">מיון</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="select-field !h-10 w-full !text-sm"
            >
              <option value="newest">חדש לישן</option>
              <option value="oldest">ישן לחדש</option>
              <option value="name_asc">שם: א-ת</option>
              <option value="name_desc">שם: ת-א</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-3 flex shrink-0 items-center justify-between gap-2 text-sm text-paper-muted">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap">שורות בעמוד:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="select-field !h-9 w-20 !text-xs"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap">מציג {start}-{end} מתוך {totalItems}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition hover:border-brand disabled:opacity-30"
            title="הקודם"
          >
            ‹
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition hover:border-brand disabled:opacity-30"
            title="הבא"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FormMenu (⋮) ─────────────────────────────────────────────────────────────

function FormMenu({
  form, isAdmin, canEdit, isOpen, isPending, onToggle, onDuplicate, onRename, onMove, onShare, onUnshare, onDelete,
}: {
  form: FormRow;
  isAdmin: boolean;
  canEdit: boolean;
  isOpen: boolean;
  isPending: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onMove: () => void;
  onShare: () => void;
  onUnshare: () => void;
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
      className="fixed z-[9999] w-48 overflow-hidden rounded-xl border border-paper-line bg-white py-1 shadow-xl"
      style={{ top: menuPos.top, left: menuPos.left }}
      data-form-menu-portal
    >
      {canEdit && (
        <Link
          href={`/forms/${form.id}/edit`}
          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
        >
          <EditPenIcon /> עריכת שדות
        </Link>
      )}
      {canEdit && !form.archived_at && (
        <Link
          href={`/forms/${form.id}/send`}
          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
        >
          <SendArrowIcon /> שליחה ללקוח
        </Link>
      )}
      <Link
        href={`/forms/${form.id}/preview`}
        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
      >
        <EyeIcon /> תצוגה מקדימה
      </Link>
      {canEdit && (
        <>
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
          {isAdmin && (
            <button
              onClick={form.visibility === "shared" ? onUnshare : onShare}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50"
            >
              <ShareIcon /> {form.visibility === "shared" ? "הפוך לפרטי" : "שתף"}
            </button>
          )}
          <div className="my-1 border-t border-paper-line" />
          <button
            onClick={onDelete}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 transition hover:bg-red-50"
          >
            <TrashIcon /> מחיקה
          </button>
        </>
      )}
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
        <button onClick={onClose} className="btn-outline">ביטול</button>
      </div>
    </Modal>
  );
}

function DeleteFormModal({
  formName,
  onConfirm,
  onClose,
}: {
  formName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="מחיקת תבנית" onClose={onClose}>
      <p className="text-sm text-paper-text">
        למחוק את התבנית <span className="font-semibold">&quot;{formName}&quot;</span>?
      </p>
      <p className="mt-1 text-sm text-text-secondary">לא ניתן לשחזר פעולה זו.</p>
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onClose} className="btn-outline">ביטול</button>
        <button onClick={onConfirm} className="btn-danger-outline">מחיקת תבנית</button>
      </div>
    </Modal>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  hasAnyForms,
  isFiltered,
  canEdit,
  onClearFilter,
  onNewForm,
}: {
  hasAnyForms: boolean;
  isFiltered: boolean;
  canEdit: boolean;
  onClearFilter: () => void;
  onNewForm: () => void;
}) {
  if (isFiltered) {
    return (
      <div className="card border-dashed p-12 text-center">
        <p className="mb-4 text-paper-muted">לא נמצאו תבניות התואמות את החיפוש.</p>
        <button onClick={onClearFilter} className="btn-outline">נקה סינון</button>
      </div>
    );
  }
  return (
    <div className={`card border-dashed p-12 text-center ${!hasAnyForms ? "empty-state-pattern" : ""}`}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
        <FormSmallIcon />
      </div>
      <p className="mb-4 text-paper-muted">
        {hasAnyForms ? "אין תבניות בתיקייה זו." : "עדיין אין תבניות. העלה PDF כדי להתחיל."}
      </p>
      {!hasAnyForms && canEdit && (
        <button onClick={onNewForm} className="btn-primary inline-flex">
          העלאת טופס ראשון
        </button>
      )}
    </div>
  );
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "h-4 w-4"} aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 5h16M7 10h10M10 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.2 10.7 15.8 6.3M8.2 13.3l7.6 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
