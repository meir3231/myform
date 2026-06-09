"use client";

import { useState } from "react";
import Link from "next/link";
import { STATUS_META } from "@/lib/status";
import type { SubmissionStatus } from "@/lib/database.types";

type Sub = {
  id: string;
  recipient_name: string;
  status: SubmissionStatus;
  form_id: string;
};

type Form = {
  id: string;
  name: string;
  page_count: number;
  is_reusable: boolean;
  archived_at: string | null;
};

export function DashboardTabs({
  pendingSubs,
  forms,
  formName,
}: {
  pendingSubs: Sub[];
  forms: Form[];
  formName: Map<string, string>;
}) {
  const [tab, setTab] = useState<"submissions" | "templates">("submissions");

  return (
    <section className="card mb-6 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-paper-line">
        <TabBtn
          active={tab === "submissions"}
          onClick={() => setTab("submissions")}
          count={pendingSubs.length}
        >
          ממתינים לחתימה
        </TabBtn>
        <TabBtn
          active={tab === "templates"}
          onClick={() => setTab("templates")}
          count={forms.length}
        >
          תבניות
        </TabBtn>
        <div className="flex-1" />
        <Link
          href={tab === "submissions" ? "/submissions" : "/templates"}
          className="self-center px-4 text-sm text-brand transition hover:underline"
        >
          לכל {tab === "submissions" ? "ההגשות" : "התבניות"} ←
        </Link>
      </div>

      {/* Panel */}
      <div className="relative overflow-hidden">
        <div
          className="transition-all duration-300 ease-in-out"
          style={{
            transform: tab === "submissions" ? "translateX(0)" : "translateX(-100%)",
            display: "flex",
            width: "200%",
          }}
        >
          {/* Submissions panel */}
          <div className="w-1/2 shrink-0">
            {pendingSubs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-paper-muted">אין הגשות ממתינות.</p>
            ) : (
              <table className="w-full text-right text-sm">
                <thead className="text-paper-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">לקוח</th>
                    <th className="px-5 py-2.5 font-medium">טופס</th>
                    <th className="px-5 py-2.5 font-medium">סטטוס</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-line">
                  {pendingSubs.map((s) => {
                    const meta = STATUS_META[s.status];
                    return (
                      <tr key={s.id} className="transition hover:bg-brand/5">
                        <td className="px-5 py-3 text-paper-text">{s.recipient_name}</td>
                        <td className="px-5 py-3 text-paper-muted">{formName.get(s.form_id) ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`badge badge-dot ${meta.className}`}>{meta.label}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/submissions/${s.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-medium text-brand transition hover:bg-brand/10"
                          >
                            פרטים ←
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Templates panel */}
          <div className="w-1/2 shrink-0">
            {forms.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-paper-muted">אין תבניות עדיין.</p>
            ) : (
              <table className="w-full text-right text-sm">
                <thead className="text-paper-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">שם תבנית</th>
                    <th className="px-5 py-2.5 font-medium">עמודים</th>
                    <th className="px-5 py-2.5 font-medium">סוג</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-line">
                  {forms.slice(0, 8).map((f) => (
                    <tr key={f.id} className="transition hover:bg-brand/5">
                      <td className="px-5 py-3 font-medium text-paper-text">{f.name}</td>
                      <td className="px-5 py-3 text-paper-muted">{f.page_count}</td>
                      <td className="px-5 py-3">
                        {f.archived_at ? (
                          <span className="badge bg-slate-100 text-slate-500">הושבתה</span>
                        ) : f.is_reusable ? (
                          <span className="badge bg-brand/10 text-brand">שימוש חוזר</span>
                        ) : (
                          <span className="badge bg-amber-100 text-amber-700">חד-פעמי</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/forms/${f.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-medium text-brand transition hover:bg-brand/10"
                        >
                          עריכה ←
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TabBtn({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors ${
        active
          ? "text-brand border-b-2 border-brand"
          : "text-paper-muted hover:text-paper-text border-b-2 border-transparent"
      }`}
    >
      {children}
      {count > 0 && (
        <span
          className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
            active ? "bg-brand text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
