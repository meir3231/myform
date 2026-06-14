"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { STATUS_META } from "@/lib/status";
import type { SubmissionStatus } from "@/lib/database.types";
import { useToast } from "@/components/Toast";
import {
  resendSubmissionLink,
  getSubmissionPreviewLink,
  getCompletedPdfUrl,
  expireSubmissionLink,
  toggleSubmissionHandled,
  deleteSubmission,
} from "./actions";

const VALID_STATUSES: SubmissionStatus[] = ["pending", "opened", "completed", "expired"];
const PAGE_SIZE_OPTIONS = [10, 25, 50];

type SubmissionRow = {
  id: string;
  recipient_name: string;
  recipient_email: string;
  status: SubmissionStatus;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  created_at: string;
  expires_at: string;
  form_id: string;
  created_by: string | null;
  handled: boolean;
};

type Option = { id: string; name: string };
type RowAction = "resend" | "preview" | "download" | "expire" | "copyLink" | "toggleHandled" | "delete";

export function TrackingClient({
  submissions,
  formName,
  formFolder,
  folderName,
  userName,
  folderOptions,
  userOptions,
  canEdit,
}: {
  submissions: SubmissionRow[];
  formName: Map<string, string>;
  formFolder: Map<string, string | null>;
  folderName: Map<string, string>;
  userName: Map<string, string>;
  folderOptions: Option[];
  userOptions: Option[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const initialStatus: SubmissionStatus | "all" =
    statusParam && (VALID_STATUSES as string[]).includes(statusParam) ? (statusParam as SubmissionStatus) : "all";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">(initialStatus);
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (folderFilter !== "all") {
        const fid = formFolder.get(s.form_id) ?? null;
        if (folderFilter === "none" ? fid !== null : fid !== folderFilter) return false;
      }
      if (userFilter !== "all") {
        if (userFilter === "none" ? s.created_by !== null : s.created_by !== userFilter) return false;
      }
      if (q) {
        const name = s.recipient_name.toLowerCase();
        const email = s.recipient_email.toLowerCase();
        const form = (formName.get(s.form_id) ?? "").toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !form.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, search, statusFilter, folderFilter, userFilter, formFolder, formName]);

  const isFiltered = search !== "" || statusFilter !== "all" || folderFilter !== "all" || userFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setFolderFilter("all");
    setUserFilter("all");
  }

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, folderFilter, userFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // ─── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const submittedToday = submissions.filter(
      (s) => s.completed_at && new Date(s.completed_at).getTime() >= todayStartMs
    ).length;
    const pendingReview = submissions.filter((s) => s.status === "opened").length;
    const signed = submissions.filter((s) => s.status === "completed").length;
    const needsCompletion = submissions.filter((s) => s.status === "pending" || s.status === "expired").length;

    return [
      { label: "הוגשו היום", value: submittedToday, color: "#22C55E", icon: <CheckIcon /> },
      { label: "ממתינים לבדיקה", value: pendingReview, color: "#3B82F6", icon: <EyeIcon /> },
      { label: "נחתמו", value: signed, color: "#14B8A6", icon: <SignatureIcon /> },
      { label: "דורשים השלמה", value: needsCompletion, color: "#F59E0B", icon: <WarningIcon /> },
    ];
  }, [submissions]);

  // ─── פעילות אחרונה ──────────────────────────────────────────────────────────
  const activity = useMemo(() => {
    return submissions
      .map(latestEvent)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);
  }, [submissions]);

  // ─── בחירה מרובה ────────────────────────────────────────────────────────────
  const remindableSelected = useMemo(
    () =>
      [...selected].filter((id) => {
        const s = submissions.find((x) => x.id === id);
        return s && s.status !== "completed";
      }),
    [selected, submissions]
  );

  const allPagedSelected = paged.length > 0 && paged.every((s) => selected.has(s.id));

  function toggleSelectAllPaged() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPagedSelected) paged.forEach((s) => next.delete(s.id));
      else paged.forEach((s) => next.add(s.id));
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ─── פעולות שורה ────────────────────────────────────────────────────────────
  async function handleRowAction(id: string, action: RowAction) {
    if (action === "expire") {
      if (!confirm("לבטל את הלינק להגשה זו? הלקוח לא יוכל להמשיך למלא את הטופס.")) return;
    }
    if (action === "delete") {
      if (!confirm("למחוק את ההגשה לצמיתות? לא ניתן לשחזר פעולה זו.")) return;
    }
    setBusyId(id);
    try {
      if (action === "resend") {
        const res = await resendSubmissionLink(id);
        if (res.error) showToast(res.error, "error");
        else showToast(res.emailSent ? "תזכורת נשלחה ללקוח בהצלחה" : "הקישור חודש, אך המייל לא נשלח (בדוק הגדרות שליחה)", "success");
        router.refresh();
      } else if (action === "preview") {
        const res = await getSubmissionPreviewLink(id);
        if (res.error) showToast(res.error, "error");
        else if (res.link) {
          window.open(res.link, "_blank", "noopener,noreferrer");
          router.refresh();
        }
      } else if (action === "download") {
        const res = await getCompletedPdfUrl(id);
        if (res.error) showToast(res.error, "error");
        else if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
      } else if (action === "expire") {
        const res = await expireSubmissionLink(id);
        if (res.error) showToast(res.error, "error");
        else {
          showToast("הלינק להגשה זו בוטל", "success");
          router.refresh();
        }
      } else if (action === "copyLink") {
        const res = await getSubmissionPreviewLink(id);
        if (res.error) showToast(res.error, "error");
        else if (res.link) {
          await navigator.clipboard.writeText(res.link);
          showToast("הקישור הועתק", "success");
          router.refresh();
        }
      } else if (action === "toggleHandled") {
        const current = submissions.find((x) => x.id === id);
        const res = await toggleSubmissionHandled(id, !(current?.handled));
        if (res.error) showToast(res.error, "error");
        else router.refresh();
      } else if (action === "delete") {
        const res = await deleteSubmission(id);
        if (res.error) showToast(res.error, "error");
        else {
          showToast("ההגשה נמחקה", "success");
          router.refresh();
        }
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkReminder() {
    if (remindableSelected.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    let sent = 0;
    for (const id of remindableSelected) {
      const res = await resendSubmissionLink(id);
      if (!res.error) sent++;
    }
    setBulkBusy(false);
    setSelected(new Set());
    showToast(
      sent === remindableSelected.length
        ? `נשלחו ${sent} תזכורות בהצלחה`
        : `נשלחו ${sent} מתוך ${remindableSelected.length} תזכורות`,
      sent === remindableSelected.length ? "success" : "error"
    );
    router.refresh();
  }

  function exportCsv() {
    const headers = ["לקוח", "מייל", "טופס", "קטגוריה", "סטטוס", "נשלח", "הוגש", "מטפל"];
    const rows = filtered.map((s) => [
      s.recipient_name,
      s.recipient_email,
      formName.get(s.form_id) ?? "",
      categoryLabel(s.form_id, formFolder, folderName),
      STATUS_META[s.status].label,
      s.sent_at ? new Date(s.sent_at).toLocaleString("he-IL") : "",
      s.completed_at ? new Date(s.completed_at).toLocaleString("he-IL") : "",
      handlerName(s.created_by, userName),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `מעקב-שליחות-${new Date().toLocaleDateString("he-IL")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      {/* כותרת ושורת פעולות */}
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="h1 leading-none">מעקב שליחות</h1>
          <p className="text-sm text-paper-muted">מעקב אחר הטפסים שנשלחו ללקוחות וסטטוס המילוי והחתימה שלהם.</p>
        </div>
        <div className="flex items-center gap-4">
          {canEdit && (
            <button
              onClick={handleBulkReminder}
              disabled={remindableSelected.length === 0 || bulkBusy}
              className="btn-primary-lg"
            >
              <SendIcon />
              שליחת תזכורת{remindableSelected.length > 0 ? ` (${remindableSelected.length})` : ""}
            </button>
          )}
          <button onClick={exportCsv} disabled={filtered.length === 0} className="btn-secondary">
            <ExportIcon />
            ייצוא לאקסל
          </button>
          <button
            onClick={() => setActivityOpen(true)}
            className="btn-icon xl:hidden"
            aria-label="פעילות אחרונה"
            title="פעילות אחרונה"
          >
            <ActivityPanelIcon />
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card flex items-center gap-3 p-2.5">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${k.color}1a`, color: k.color }}
            >
              {k.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="kpi-number leading-tight">{k.value}</p>
              <p className="truncate text-xs text-paper-muted">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* סרגל פילטרים */}
      <div className="card flex shrink-0 flex-wrap items-center gap-3 p-3">
        <div className="relative w-[330px] max-w-full">
          <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם לקוח, מייל או טופס..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pr-10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | "all")}
          className="select-field w-[190px] max-w-full"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="pending">נשלח</option>
          <option value="opened">ממתין</option>
          <option value="completed">הושלם</option>
          <option value="expired">דורש תיקון</option>
        </select>

        <select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
          className="select-field w-[190px] max-w-full"
        >
          <option value="all">כל הקטגוריות</option>
          <option value="none">כללי (ללא קטגוריה)</option>
          {folderOptions.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        {userOptions.length > 1 && (
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="select-field w-[190px] max-w-full"
          >
            <option value="all">כל המטפלים</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        {isFiltered && (
          <span className="text-sm text-paper-muted">
            {filtered.length} מתוך {submissions.length}
          </span>
        )}
        {isFiltered && (
          <button onClick={clearFilters} className="btn-outline !min-w-0 !h-9 !px-3 !text-xs">
            נקה סינון
          </button>
        )}
      </div>

      {/* תוכן ראשי: פעילות אחרונה + טבלת הגשות */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* פעילות אחרונה - דסקטופ */}
        <aside className="card hidden w-[300px] shrink-0 flex-col overflow-hidden p-3 xl:flex">
          <h2 className="h2 mb-2 shrink-0">פעילות אחרונה</h2>
          <RecentActivityList activity={activity} />
        </aside>

        {/* טבלת הגשות */}
        <div className="card flex min-w-0 flex-1 flex-col overflow-hidden">
          {submissions.length === 0 ? (
            <div className="empty-state-pattern flex flex-1 flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
                <SendIcon />
              </div>
              <p className="mb-4 text-paper-muted">אין עדיין הגשות.</p>
              {canEdit && (
                <Link href="/templates" className="btn-primary inline-flex">שליחת טופס ראשון</Link>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
              <p className="mb-3 text-paper-muted">לא נמצאו הגשות התואמות את הסינון.</p>
              <button onClick={clearFilters} className="btn-outline">נקה סינון</button>
            </div>
          ) : (
            <>
              {/* טבלה - דסקטופ/טאבלט */}
              <div className="hidden min-h-0 flex-1 overflow-auto md:block">
                <table className="w-full min-w-[960px] text-right text-sm">
                  <thead className="sticky top-0 z-10 h-12 bg-white text-xs font-medium text-paper-muted">
                    <tr className="border-b border-soft-border">
                      <th className="w-11 px-3"><input type="checkbox" checked={allPagedSelected} onChange={toggleSelectAllPaged} className="h-4 w-4 accent-brand" /></th>
                      <th className="w-[170px] px-3 text-right">לקוח</th>
                      <th className="w-[190px] px-3 text-right">טופס</th>
                      <th className="w-[130px] px-3 text-right">קטגוריה</th>
                      <th className="w-[120px] px-3 text-right">סטטוס</th>
                      <th className="w-[110px] px-3 text-right">תאריך שליחה</th>
                      <th className="w-[130px] px-3 text-right">מטפל</th>
                      <th className="w-[120px] px-3 text-right">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((s) => (
                      <SubmissionTableRow
                        key={s.id}
                        s={s}
                        formNameStr={formName.get(s.form_id) ?? "—"}
                        categoryLabelStr={categoryLabel(s.form_id, formFolder, folderName)}
                        handlerNameStr={handlerName(s.created_by, userName)}
                        selected={selected.has(s.id)}
                        busy={busyId === s.id}
                        canEdit={canEdit}
                        onToggleSelect={() => toggleSelect(s.id)}
                        onAction={(action) => handleRowAction(s.id, action)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* כרטיסים - מובייל */}
              <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
                {paged.map((s) => (
                  <SubmissionCard
                    key={s.id}
                    s={s}
                    formNameStr={formName.get(s.form_id) ?? "—"}
                    categoryLabelStr={categoryLabel(s.form_id, formFolder, folderName)}
                    handlerNameStr={handlerName(s.created_by, userName)}
                    busy={busyId === s.id}
                    canEdit={canEdit}
                    onAction={(action) => handleRowAction(s.id, action)}
                  />
                ))}
              </div>

              <Pagination
                page={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </div>
      </div>

      {/* פעילות אחרונה - Drawer (מסכים צרים מ-xl) */}
      {activityOpen && (
        <>
          <div className="mobile-nav-backdrop xl:hidden" onClick={() => setActivityOpen(false)} />
          <aside
            className="fixed inset-y-0 right-0 z-[9999] flex w-[300px] max-w-[85vw] flex-col overflow-hidden bg-white p-3 shadow-xl xl:hidden"
            style={{ animation: "drawer-slide-in 0.22s ease-out" }}
          >
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h2 className="h2">פעילות אחרונה</h2>
              <button onClick={() => setActivityOpen(false)} className="btn-icon !h-9 !w-9" aria-label="סגירה">
                <CloseIcon />
              </button>
            </div>
            <RecentActivityList activity={activity} />
          </aside>
        </>
      )}
    </div>
  );
}

// ─── עזרי תצוגה ─────────────────────────────────────────────────────────────────

function categoryLabel(formId: string, formFolder: Map<string, string | null>, folderName: Map<string, string>): string {
  const folderId = formFolder.get(formId) ?? null;
  if (!folderId) return "כללי";
  return folderName.get(folderId) ?? "כללי";
}

function handlerName(createdBy: string | null, userName: Map<string, string>): string {
  if (!createdBy) return "—";
  return userName.get(createdBy) ?? "—";
}

type ActivityType = "completed" | "opened" | "sent";
type ActivityEvent = { id: string; at: string; text: string; type: ActivityType };

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  completed: "#22C55E",
  opened: "#3B82F6",
  sent: "#14B8A6",
};

function latestEvent(s: SubmissionRow): ActivityEvent {
  if (s.completed_at) return { id: s.id, at: s.completed_at, text: `${s.recipient_name} השלים/ה ומילא/ה את הטופס`, type: "completed" };
  if (s.opened_at) return { id: s.id, at: s.opened_at, text: `${s.recipient_name} פתח/ה את הטופס`, type: "opened" };
  return { id: s.id, at: s.sent_at ?? s.created_at, text: `נשלח טופס ל${s.recipient_name}`, type: "sent" };
}

function formatActivityTime(at: string): string {
  const d = new Date(at);
  const now = new Date();
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `${time} · היום`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `${time} · אתמול`;
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

function DateCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-text-secondary">—</span>;
  const d = new Date(value);
  return (
    <div className="leading-tight">
      <div className="text-paper-text">{d.toLocaleDateString("he-IL")}</div>
      <div className="text-xs text-text-secondary">{d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
  );
}

// ─── פאנל פעילות אחרונה (משותף לדסקטופ ול-Drawer) ────────────────────────────────

function RecentActivityList({ activity }: { activity: ActivityEvent[] }) {
  if (activity.length === 0) {
    return (
      <div className="empty-state-pattern flex flex-1 items-center justify-center rounded-xl">
        <p className="text-sm text-paper-muted">אין עדיין פעילות להצגה.</p>
      </div>
    );
  }
  return (
    <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto text-sm">
      {activity.map((a, i) => (
        <li key={`${a.id}-${i}`} className="border-b border-soft-border pb-1.5 last:border-0 last:pb-0">
          <Link href={`/tracking/${a.id}`} className="flex items-center gap-2.5 rounded-lg p-1 transition hover:bg-background">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${ACTIVITY_COLORS[a.type]}1a`, color: ACTIVITY_COLORS[a.type] }}
            >
              <ActivityIcon type={a.type} />
            </span>
            <p className="min-w-0 flex-1 truncate text-xs text-paper-text">{a.text}</p>
            <span className="shrink-0 text-xs text-paper-muted">{formatActivityTime(a.at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ─── תג "טופל" ──────────────────────────────────────────────────────────────────

function HandledBadge() {
  return (
    <span
      title="טופל"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
        <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// ─── שורת טבלה ──────────────────────────────────────────────────────────────────

function SubmissionTableRow({
  s,
  formNameStr,
  categoryLabelStr,
  handlerNameStr,
  selected,
  busy,
  canEdit,
  onToggleSelect,
  onAction,
}: {
  s: SubmissionRow;
  formNameStr: string;
  categoryLabelStr: string;
  handlerNameStr: string;
  selected: boolean;
  busy: boolean;
  canEdit: boolean;
  onToggleSelect: () => void;
  onAction: (action: RowAction) => void;
}) {
  const router = useRouter();
  const meta = STATUS_META[s.status];

  return (
    <tr
      onClick={() => router.push(`/tracking/${s.id}`)}
      className={`cursor-pointer transition ${selected ? "bg-brand/5" : ""}`}
    >
      <td className="px-3" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="h-4 w-4 accent-brand" />
      </td>
      <td className="px-3">
        <div className="flex items-center gap-1.5">
          <div className="min-w-0">
            <div className="truncate font-medium text-paper-text">{s.recipient_name}</div>
            <div className="truncate text-xs text-paper-muted" dir="ltr">{s.recipient_email}</div>
          </div>
          {s.handled && <HandledBadge />}
        </div>
      </td>
      <td className="px-3 truncate text-paper-text">{formNameStr}</td>
      <td className="px-3 truncate text-text-secondary">{categoryLabelStr}</td>
      <td className="px-3">
        <span className={`badge badge-dot ${meta.className}`}>{meta.label}</span>
      </td>
      <td className="px-3"><DateCell value={s.sent_at} /></td>
      <td className="px-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
            {handlerNameStr.slice(0, 1)}
          </span>
          <span className="truncate text-text-secondary">{handlerNameStr}</span>
        </div>
      </td>
      <td className="px-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <Link href={`/tracking/${s.id}`} className="btn-icon !h-9 !w-9" title="צפייה">
            <EyeIcon />
          </Link>
          <RowMenu id={s.id} status={s.status} handled={s.handled} busy={busy} canEdit={canEdit} onAction={onAction} />
        </div>
      </td>
    </tr>
  );
}

// ─── כרטיס - מובייל ─────────────────────────────────────────────────────────────

function SubmissionCard({
  s,
  formNameStr,
  categoryLabelStr,
  handlerNameStr,
  busy,
  canEdit,
  onAction,
}: {
  s: SubmissionRow;
  formNameStr: string;
  categoryLabelStr: string;
  handlerNameStr: string;
  busy: boolean;
  canEdit: boolean;
  onAction: (action: RowAction) => void;
}) {
  const meta = STATUS_META[s.status];

  return (
    <Link href={`/tracking/${s.id}`} className="row-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <div className="min-w-0">
            <div className="truncate font-medium text-paper-text">{s.recipient_name}</div>
            <div className="truncate text-xs text-paper-muted" dir="ltr">{s.recipient_email}</div>
          </div>
          {s.handled && <HandledBadge />}
        </div>
        <span className={`badge badge-dot shrink-0 ${meta.className}`}>{meta.label}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-paper-text">{formNameStr}</span>
        <span className="shrink-0 text-text-secondary">{categoryLabelStr}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
            {handlerNameStr.slice(0, 1)}
          </span>
          <span className="truncate text-xs text-text-secondary">{handlerNameStr}</span>
        </div>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link href={`/tracking/${s.id}`} className="btn-icon !h-9 !w-9" title="צפייה">
            <EyeIcon />
          </Link>
          <RowMenu id={s.id} status={s.status} handled={s.handled} busy={busy} canEdit={canEdit} onAction={onAction} />
        </div>
      </div>
    </Link>
  );
}

// ─── תפריט פעולות שורה (⋮) ──────────────────────────────────────────────────────

function RowMenu({
  id,
  status,
  handled,
  busy,
  canEdit,
  onAction,
}: {
  id: string;
  status: SubmissionStatus;
  handled: boolean;
  busy: boolean;
  canEdit: boolean;
  onAction: (action: RowAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleDocClick(e: MouseEvent) {
      const t = e.target as Element;
      if (!t.closest("[data-row-menu]") && !t.closest("[data-row-menu-portal]")) setOpen(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [open]);

  function handleToggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left - 170 });
    }
    setOpen((o) => !o);
  }

  function run(action: RowAction) {
    setOpen(false);
    onAction(action);
  }

  const itemClass = "flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-paper-text transition hover:bg-slate-50";
  const dangerClass = "flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 transition hover:bg-red-50";

  const dropdown = open && menuPos ? createPortal(
    <div
      className="fixed z-[9999] w-52 overflow-hidden rounded-xl border border-paper-line bg-white py-1 shadow-xl"
      style={{ top: menuPos.top, left: Math.max(8, menuPos.left) }}
      data-row-menu-portal
    >
      <Link href={`/tracking/${id}`} onClick={() => setOpen(false)} className={itemClass}>
        <EyeIcon /> פתיחה
      </Link>
      {status !== "completed" && (
        <button onClick={() => run("preview")} className={itemClass}>
          <ExternalLinkIcon /> צפייה כמו שהלקוח רואה
        </button>
      )}
      {status === "completed" && (
        <button onClick={() => run("download")} className={itemClass}>
          <DownloadIcon /> הורדת PDF חתום
        </button>
      )}
      {canEdit && status !== "completed" && (
        <button onClick={() => run("resend")} className={itemClass}>
          <SendIcon /> {status === "expired" ? "שליחה מחדש" : "שליחת תזכורת"}
        </button>
      )}
      {status !== "completed" && (
        <button onClick={() => run("copyLink")} className={itemClass}>
          <LinkIcon /> העתקת קישור
        </button>
      )}
      <div className="my-1 border-t border-paper-line" />
      <button onClick={() => run("toggleHandled")} className={itemClass}>
        <CheckSquareIcon /> {handled ? "סימון כלא טופל" : "סימון כטופל"}
      </button>
      {canEdit && (
        <>
          <div className="my-1 border-t border-paper-line" />
          {(status === "pending" || status === "opened") && (
            <button onClick={() => run("expire")} className={dangerClass}>
              <LinkOffIcon /> ביטול קישור
            </button>
          )}
          <button onClick={() => run("delete")} className={dangerClass}>
            <TrashIcon /> מחיקה
          </button>
        </>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div data-row-menu>
      <button
        ref={btnRef}
        onClick={handleToggle}
        disabled={busy}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        title="פעולות נוספות"
      >
        <DotsVerticalIcon />
      </button>
      {dropdown}
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
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-soft-border px-4 py-2.5 text-sm text-paper-muted">
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

// ─── אייקונים ───────────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case "completed":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "opened":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "sent":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M4 12 20 4l-5 16-3-7-8-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
  }
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 12 20 4l-5 16-3-7-8-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function DotsVerticalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M14 4h6v6M20 4 11 13M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M9 12h6M10 7H7a4 4 0 1 0 0 8h1M14 7h2a4 4 0 1 1 0 8h-1M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 12.5 11 16l5.5-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 7h16M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActivityPanelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12.3 11 14.8l4.5-5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M12 4 21.5 20h-19L12 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}

function SignatureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M3 17c2-3 3.5-5 5-5s1.5 3 3 3 2-5 4-5 2 4 3.5 4 1.5-1 2.5-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
