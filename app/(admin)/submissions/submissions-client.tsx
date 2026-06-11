"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { STATUS_META } from "@/lib/status";
import type { SubmissionStatus } from "@/lib/database.types";

const VALID_STATUSES: SubmissionStatus[] = ["pending", "opened", "completed", "expired"];

type SubmissionRow = {
  id: string;
  recipient_name: string;
  recipient_email: string;
  status: SubmissionStatus;
  sent_at: string | null;
  completed_at: string | null;
  form_id: string;
};

export function SubmissionsClient({
  submissions,
  formName,
  formOptions,
  currentUserRole,
}: {
  submissions: SubmissionRow[];
  formName: Map<string, string>;
  formOptions: Array<{ id: string; name: string }>;
  currentUserRole: string;
}) {
  void currentUserRole; // reserved for future admin-only filters
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const initialStatus: SubmissionStatus | "all" =
    statusParam && (VALID_STATUSES as string[]).includes(statusParam) ? (statusParam as SubmissionStatus) : "all";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">(initialStatus);
  const [formFilter, setFormFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (formFilter !== "all" && s.form_id !== formFilter) return false;
      if (q) {
        const name = s.recipient_name.toLowerCase();
        const email = s.recipient_email.toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, search, statusFilter, formFilter]);

  const isFiltered = search !== "" || statusFilter !== "all" || formFilter !== "all";

  function exportCsv() {
    const headers = ["לקוח", "מייל", "טופס", "סטטוס", "נשלח", "הושלם"];
    const rows = filtered.map((s) => [
      s.recipient_name,
      s.recipient_email,
      formName.get(s.form_id) ?? "",
      STATUS_META[s.status].label,
      s.sent_at ? new Date(s.sent_at).toLocaleDateString("he-IL") : "",
      s.completed_at ? new Date(s.completed_at).toLocaleDateString("he-IL") : "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `הגשות-${new Date().toLocaleDateString("he-IL")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex shrink-0 flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-paper-text ml-2">הגשות</h1>

        <div className="relative">
          <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="חיפוש לפי שם או מייל..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-paper-line bg-white py-1.5 pr-9 pl-3 text-sm text-paper-text placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            style={{ minWidth: 200 }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | "all")}
          className="h-9 rounded-lg border border-paper-line bg-white px-3 text-sm text-paper-text focus:border-brand focus:outline-none"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="pending">נשלח — ממתין</option>
          <option value="opened">נפתח</option>
          <option value="completed">הושלם</option>
          <option value="expired">פג תוקף</option>
        </select>

        {formOptions.length > 1 && (
          <select
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value)}
            className="h-9 max-w-[200px] rounded-lg border border-paper-line bg-white px-3 text-sm text-paper-text focus:border-brand focus:outline-none"
          >
            <option value="all">כל הטפסים</option>
            {formOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
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
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setFormFilter("all"); }}
            className="btn-ghost !py-1.5 !px-3 !text-xs"
          >
            נקה סינון
          </button>
        )}

        {filtered.length > 0 && (
          <button
            onClick={exportCsv}
            className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
            title="ייצוא ל-CSV (נפתח ב-Excel)"
          >
            <CsvIcon /> ייצוא CSV
          </button>
        )}
      </div>

      {submissions.length === 0 ? (
        <div className="card empty-state-pattern border-dashed p-12 text-center text-paper-muted">
          עדיין אין הגשות. שלח טופס ללקוח מתוך עמוד התבניות.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card border-dashed p-12 text-center">
          <p className="mb-3 text-paper-muted">לא נמצאו הגשות התואמות את הסינון.</p>
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setFormFilter("all"); }}
            className="btn-secondary"
          >
            נקה סינון
          </button>
        </div>
      ) : (
        <div className="card flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 z-10 bg-white text-paper-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">לקוח</th>
                <th className="px-4 py-3 text-right font-medium">טופס</th>
                <th className="px-4 py-3 text-right font-medium">סטטוס</th>
                <th className="px-4 py-3 text-right font-medium">נשלח</th>
                <th className="px-4 py-3 text-right font-medium">הושלם</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-line">
              {filtered.map((s, i) => {
                const meta = STATUS_META[s.status];
                const isExpanded = expandedId === s.id;
                return (
                  <>
                    <tr
                      key={s.id}
                      onClick={() => toggleExpand(s.id)}
                      className={`cursor-pointer transition hover:bg-brand/5 ${
                        isExpanded ? "bg-brand/5" : i % 2 === 1 ? "bg-slate-50/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-paper-text">{s.recipient_name}</div>
                        <div className="text-xs text-paper-muted" dir="ltr">{s.recipient_email}</div>
                      </td>
                      <td className="px-4 py-3 text-paper-muted">
                        {formName.get(s.form_id) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge badge-dot ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-paper-muted">
                        {s.sent_at ? new Date(s.sent_at).toLocaleDateString("he-IL") : "—"}
                      </td>
                      <td className="px-4 py-3 text-paper-muted">
                        {s.completed_at ? new Date(s.completed_at).toLocaleDateString("he-IL") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronIcon expanded={isExpanded} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${s.id}-expanded`} className="bg-brand/5">
                        <td colSpan={6} className="px-6 pb-4 pt-2">
                          <div className="flex flex-wrap items-center gap-5 text-sm">
                            <div>
                              <span className="text-paper-muted">מייל: </span>
                              <a href={`mailto:${s.recipient_email}`} className="text-brand hover:underline" dir="ltr">
                                {s.recipient_email}
                              </a>
                            </div>
                            {s.sent_at && (
                              <div>
                                <span className="text-paper-muted">נשלח: </span>
                                {new Date(s.sent_at).toLocaleString("he-IL")}
                              </div>
                            )}
                            {s.completed_at && (
                              <div>
                                <span className="text-paper-muted">הושלם: </span>
                                {new Date(s.completed_at).toLocaleString("he-IL")}
                              </div>
                            )}
                            <Link
                              href={`/submissions/${s.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="mr-auto flex items-center gap-1 rounded-lg border border-brand px-3 py-1 text-xs font-medium text-brand transition hover:bg-brand hover:text-white"
                            >
                              פרטים מלאים ←
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CsvIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
