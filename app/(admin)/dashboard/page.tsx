import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { STATUS_META } from "@/lib/status";
import type { SubmissionStatus } from "@/lib/database.types";

type SubmissionRow = {
  id: string;
  recipient_name: string;
  status: SubmissionStatus;
  form_id: string;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const PENDING_STATUSES: SubmissionStatus[] = ["pending", "opened"];

// האירוע העדכני ביותר שאירע בהגשה — לשימוש בפיד הפעילות.
function latestEvent(s: SubmissionRow): { at: string; text: string } {
  if (s.completed_at) return { at: s.completed_at, text: `${s.recipient_name} השלים/ה ומילא/ה את הטופס` };
  if (s.opened_at) return { at: s.opened_at, text: `${s.recipient_name} פתח/ה את הטופס` };
  if (s.sent_at) return { at: s.sent_at, text: `נשלח טופס ל${s.recipient_name}` };
  return { at: s.created_at, text: `נוצרה הגשה עבור ${s.recipient_name}` };
}

export default async function DashboardPage() {
  const { supabase } = await requireProfile();

  const { data: forms } = await supabase
    .from("forms")
    .select("id, name, page_count, created_at")
    .order("created_at", { ascending: false });

  const [{ count: sentCount }, { count: completedCount }, { count: pendingCount }] = await Promise.all([
    supabase.from("submissions").select("*", { count: "exact", head: true }).not("sent_at", "is", null),
    supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("submissions").select("*", { count: "exact", head: true }).in("status", PENDING_STATUSES),
  ]);

  const stats = [
    { label: "סה״כ טפסים",      value: forms?.length ?? 0, icon: <FormIcon />,    accent: "#9b6dff" },
    { label: "נשלחו ללקוחות",   value: sentCount ?? 0,     icon: <SentIcon />,    accent: "#4f83ff" },
    { label: "הושלמו",           value: completedCount ?? 0, icon: <CheckIcon />,  accent: "#22c55e" },
    { label: "ממתינים לחתימה",  value: pendingCount ?? 0,  icon: <PendingIcon />, accent: "#f59e0b" },
  ];

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, recipient_name, status, form_id, sent_at, opened_at, completed_at, created_at")
    .order("created_at", { ascending: false });

  const subs: SubmissionRow[] = submissions ?? [];
  const formName = new Map((forms ?? []).map((f) => [f.id, f.name]));

  // גרף שימוש: מספר ההגשות לכל טופס, ה-6 הגבוהים ביותר
  const usageCounts = new Map<string, number>();
  for (const s of subs) usageCounts.set(s.form_id, (usageCounts.get(s.form_id) ?? 0) + 1);
  const usage = [...usageCounts.entries()]
    .map(([formId, count]) => ({ formId, name: formName.get(formId) ?? "טופס שנמחק", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxUsage = Math.max(1, ...usage.map((u) => u.count));

  // פיד פעילות: 6 האירועים העדכניים ביותר
  const activity = subs
    .map(latestEvent)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  // טבלת ממתינים לחתימה
  const pendingSubs = subs.filter((s) => PENDING_STATUSES.includes(s.status)).slice(0, 8);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-paper-text">לוח בקרה</h1>
        <Link href="/templates" className="btn-ghost">
          לכל התבניות ←
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="stat-card flex items-center gap-3 border border-paper-line bg-white"
            style={{ borderTop: `3px solid ${s.accent}` }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${s.accent}1f`, color: s.accent }}
            >
              {s.icon}
            </span>
            <div>
              <p className="text-2xl font-bold text-paper-text">{s.value}</p>
              <p className="text-sm text-paper-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* גרף שימוש לפי טופס */}
        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-paper-text">שימוש לפי טופס</h2>
          {usage.length === 0 ? (
            <p className="text-sm text-paper-muted">אין עדיין הגשות להצגה.</p>
          ) : (
            <div className="space-y-3">
              {usage.map((u) => (
                <div key={u.formId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate text-paper-text">{u.name}</span>
                    <span className="shrink-0 text-paper-muted">{u.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper-line">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(u.count / maxUsage) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* פיד פעילות אחרונה */}
        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-paper-text">פעילות אחרונה</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-paper-muted">אין עדיין פעילות להצגה.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 border-b border-paper-line pb-3 last:border-0 last:pb-0">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <div className="min-w-0">
                    <p className="text-paper-text">{a.text}</p>
                    <p className="text-xs text-paper-muted">{new Date(a.at).toLocaleString("he-IL")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* טבלת טפסים ממתינים לחתימה */}
      {pendingSubs.length > 0 && (
        <section className="card mb-6 overflow-hidden">
          <h2 className="border-b border-paper-line p-5 pb-4 font-semibold text-paper-text">
            ממתינים לחתימה
          </h2>
          <table className="w-full text-right text-sm">
            <thead className="text-paper-muted">
              <tr>
                <th className="px-5 py-2.5 font-medium">לקוח</th>
                <th className="px-5 py-2.5 font-medium">טופס</th>
                <th className="px-5 py-2.5 font-medium">סטטוס</th>
                <th className="px-5 py-2.5"></th>
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
                      <Link href={`/submissions/${s.id}`} className="font-medium text-brand transition hover:underline">
                        פרטים
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

    </div>
  );
}

function FormIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7 3.5h7l3 3V20a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V6a1 1 0 0 0 1 1h2.5M9 12h6M9 15h6M9 9h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M4 12 20 4l-5 16-3-7-8-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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

function PendingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
