import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { QuickActions } from "./quick-actions";
import { DonutChart, WeeklyTrendChart } from "./charts";
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
const DAY_MS = 24 * 60 * 60 * 1000;
const DONUT_ORDER: SubmissionStatus[] = ["completed", "pending", "opened", "expired"];
const STATUS_COLORS: Record<SubmissionStatus, string> = {
  completed: "#22C55E",
  pending: "#F59E0B",
  opened: "#3B82F6",
  expired: "#94A3B8",
};

type ActivityType = "completed" | "opened" | "sent" | "created";
const ACTIVITY_COLORS: Record<ActivityType, string> = {
  completed: "#22C55E",
  opened: "#3B82F6",
  sent: "#14B8A6",
  created: "#94A3B8",
};

function within(at: string | null, startMs: number, endMs: number) {
  if (!at) return false;
  const t = new Date(at).getTime();
  return t >= startMs && t < endMs;
}

// האירוע העדכני ביותר שאירע בהגשה — לשימוש בפיד הפעילות.
function latestEvent(s: SubmissionRow): { id: string; at: string; text: string; type: ActivityType } {
  if (s.completed_at) return { id: s.id, at: s.completed_at, text: `${s.recipient_name} השלים/ה ומילא/ה את הטופס`, type: "completed" };
  if (s.opened_at) return { id: s.id, at: s.opened_at, text: `${s.recipient_name} פתח/ה את הטופס`, type: "opened" };
  if (s.sent_at) return { id: s.id, at: s.sent_at, text: `נשלח טופס ל${s.recipient_name}`, type: "sent" };
  return { id: s.id, at: s.created_at, text: `נוצרה הגשה עבור ${s.recipient_name}`, type: "created" };
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

// יום בשבוע בעברית, באות אחת (לתוויות ציר ה-X של גרף המגמה).
function shortWeekday(d: Date): string {
  const full = d.toLocaleDateString("he-IL", { weekday: "short" });
  if (full.startsWith("יום ")) return full.slice(4);
  return full === "שבת" ? "ש׳" : full;
}

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();
  const userName = profile.full_name || "מנהל";

  const [
    { data: forms },
    { data: folders },
    { data: submissions },
    [{ count: completedCount }, { count: pendingCount }],
  ] = await Promise.all([
    supabase.from("forms").select("id, name, page_count, is_reusable, archived_at, folder_id, created_at").order("created_at", { ascending: false }),
    supabase.from("folders").select("id, name").order("name"),
    supabase.from("submissions").select("id, recipient_name, status, form_id, sent_at, opened_at, completed_at, created_at").order("created_at", { ascending: false }),
    Promise.all([
      supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("submissions").select("*", { count: "exact", head: true }).in("status", PENDING_STATUSES),
    ]),
  ]);

  const subs: SubmissionRow[] = submissions ?? [];
  const formName = new Map((forms ?? []).map((f) => [f.id, f.name]));

  const now = Date.now();
  const weekAgo = now - 7 * DAY_MS;
  const twoWeeksAgo = now - 14 * DAY_MS;
  const monthAgo = now - 30 * DAY_MS;
  const twoMonthsAgo = now - 60 * DAY_MS;

  const pendingThisWeek = subs.filter((s) => PENDING_STATUSES.includes(s.status) && within(s.created_at, weekAgo, now)).length;
  const pendingPrevWeek = subs.filter((s) => PENDING_STATUSES.includes(s.status) && within(s.created_at, twoWeeksAgo, weekAgo)).length;

  const completedThisWeek = subs.filter((s) => within(s.completed_at, weekAgo, now)).length;
  const completedPrevWeek = subs.filter((s) => within(s.completed_at, twoWeeksAgo, weekAgo)).length;

  const sentThisWeek = subs.filter((s) => within(s.sent_at, weekAgo, now)).length;
  const sentPrevWeek = subs.filter((s) => within(s.sent_at, twoWeeksAgo, weekAgo)).length;

  const activeFormsCount = (forms ?? []).filter((f) => !f.archived_at).length;
  const formsThisMonth = (forms ?? []).filter((f) => within(f.created_at, monthAgo, now)).length;
  const formsPrevMonth = (forms ?? []).filter((f) => within(f.created_at, twoMonthsAgo, monthAgo)).length;

  const kpis = [
    {
      label: "ממתינים לחתימה",
      value: pendingCount ?? 0,
      icon: <PendingIcon />,
      color: "#F59E0B",
      trend: pendingThisWeek - pendingPrevWeek,
      trendLabel: "מהשבוע שעבר",
      href: "/submissions?status=pending",
    },
    {
      label: "הושלמו",
      value: completedCount ?? 0,
      icon: <CheckIcon />,
      color: "#22C55E",
      trend: completedThisWeek - completedPrevWeek,
      trendLabel: "מהשבוע שעבר",
      href: "/submissions?status=completed",
    },
    {
      label: "נשלחו השבוע",
      value: sentThisWeek,
      icon: <SentIcon />,
      color: "#3B82F6",
      trend: sentThisWeek - sentPrevWeek,
      trendLabel: "מהשבוע שעבר",
      href: "/submissions",
    },
    {
      label: "טפסים פעילים",
      value: activeFormsCount,
      icon: <FormIcon />,
      color: "#14B8A6",
      trend: formsThisMonth - formsPrevMonth,
      trendLabel: "מהחודש שעבר",
      href: "/templates",
    },
  ];

  // גרף שימוש: מספר ההגשות לכל טופס, ה-6 הגבוהים ביותר
  const usageCounts = new Map<string, number>();
  for (const s of subs) usageCounts.set(s.form_id, (usageCounts.get(s.form_id) ?? 0) + 1);
  const usage = [...usageCounts.entries()]
    .map(([formId, count]) => ({ formId, name: formName.get(formId) ?? "טופס שנמחק", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxUsage = Math.max(1, ...usage.map((u) => u.count));

  // פיד פעילות: 5 האירועים העדכניים ביותר
  const activity = subs
    .map(latestEvent)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  // סקירת שליחות: התפלגות ההגשות לפי סטטוס
  const statusCounts: Record<SubmissionStatus, number> = { pending: 0, opened: 0, completed: 0, expired: 0 };
  for (const s of subs) statusCounts[s.status] += 1;
  const donutData = DONUT_ORDER
    .map((status) => ({ label: STATUS_META[status].label, value: statusCounts[status], color: STATUS_COLORS[status] }))
    .filter((d) => d.value > 0);

  // מגמה שבועית: מספר הגשות חדשות בכל אחד מ-7 הימים האחרונים
  const weekTrend = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (6 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const count = subs.filter((s) => within(s.created_at, dayStart.getTime(), dayEnd.getTime())).length;
    return { label: shortWeekday(dayStart), count };
  });

  // משימות מהירות: פריטים שדורשים תשומת לב
  const quickTasks = [
    {
      label: "טפסים שנפתחו וטרם הושלמו",
      count: subs.filter((s) => s.status === "opened").length,
      icon: <EyeIcon />,
      color: "#3B82F6",
      href: "/submissions?status=opened",
    },
    {
      label: "ממתינים לחתימה מעל 3 ימים",
      count: subs.filter((s) => s.status === "pending" && s.sent_at && now - new Date(s.sent_at).getTime() > 3 * DAY_MS).length,
      icon: <PendingIcon />,
      color: "#F59E0B",
      href: "/submissions?status=pending",
    },
    {
      label: "טפסים שפג תוקפם",
      count: subs.filter((s) => s.status === "expired").length,
      icon: <WarningIcon />,
      color: "#EF4444",
      href: "/submissions?status=expired",
    },
  ];

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-paper-text">לוח בקרה</h1>
          <p className="mt-0.5 text-sm text-paper-muted">ברוך הבא, {userName}. הנה סקירה כללית של הפעילות שלך.</p>
        </div>
        <QuickActions
          forms={(forms ?? []).filter((f) => !f.archived_at).map((f) => ({ id: f.id, name: f.name, page_count: f.page_count, folder_id: f.folder_id }))}
          folders={folders ?? []}
          canEdit={canEdit(profile.role)}
        />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid min-h-0 flex-[3] gap-3 lg:grid-cols-2">
        {/* שימוש לפי טופס */}
        <section className="card flex h-full min-h-0 flex-col overflow-hidden p-3">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="h2">שימוש לפי טופס</h2>
            <Link href="/templates" className="text-sm text-brand transition hover:underline">
              צפה בהכל
            </Link>
          </div>
          {usage.length === 0 ? (
            <div className="empty-state-pattern flex flex-1 items-center justify-center rounded-xl">
              <p className="text-sm text-paper-muted">אין עדיין הגשות להצגה.</p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {usage.map((u) => (
                <div key={u.formId}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="truncate text-paper-text">{u.name}</span>
                    <span className="shrink-0 text-paper-muted">{u.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-paper-line">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(u.count / maxUsage) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* פעילות אחרונה */}
        <section className="card flex h-full min-h-0 flex-col overflow-hidden p-3">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="h2">פעילות אחרונה</h2>
            <Link href="/submissions" className="text-sm text-brand transition hover:underline">
              צפה בהכל
            </Link>
          </div>
          {activity.length === 0 ? (
            <div className="empty-state-pattern flex flex-1 items-center justify-center rounded-xl">
              <p className="text-sm text-paper-muted">אין עדיין פעילות להצגה.</p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto text-sm">
              {activity.map((a, i) => (
                <li key={i} className="border-b border-paper-line pb-1.5 last:border-0 last:pb-0">
                  <Link href={`/submissions/${a.id}`} className="flex items-center gap-2.5 rounded-lg transition hover:bg-background">
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
          )}
        </section>
      </div>

      <div className="grid min-h-0 flex-[2] gap-3 lg:grid-cols-3">
        {/* משימות מהירות */}
        <section className="card flex h-full min-h-0 flex-col overflow-hidden p-3">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="h2">משימות מהירות</h2>
            <Link href="/submissions" className="text-sm text-brand transition hover:underline">
              לכל המשימות
            </Link>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {quickTasks.map((t) => (
              <li key={t.label}>
                <Link
                  href={t.href}
                  className="flex h-9 items-center gap-2 rounded-xl border border-paper-line px-2 transition hover:bg-background"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                  >
                    {t.icon}
                  </span>
                  <span className="flex-1 truncate text-xs text-paper-text">{t.label}</span>
                  <span
                    className="flex h-5 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                    style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                  >
                    {t.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* סקירת שליחות */}
        <section className="card flex h-full min-h-0 flex-col overflow-hidden p-3">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="h2">סקירת שליחות</h2>
            <Link href="/submissions" className="text-sm text-brand transition hover:underline">
              צפה בהכל
            </Link>
          </div>
          {subs.length === 0 ? (
            <div className="empty-state-pattern flex flex-1 items-center justify-center rounded-xl py-6">
              <p className="text-sm text-paper-muted">אין עדיין הגשות להצגה.</p>
            </div>
          ) : (
            <DonutChart data={donutData} total={subs.length} size={84} />
          )}
        </section>

        {/* מגמה שבועית */}
        <section className="card flex h-full min-h-0 flex-col overflow-hidden p-3">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="h2">מגמה שבועית</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-paper-muted">7 הימים האחרונים</span>
              <Link href="/submissions" className="text-sm text-brand transition hover:underline">
                צפה בהכל
              </Link>
            </div>
          </div>
          <WeeklyTrendChart data={weekTrend} />
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
  trend,
  trendLabel,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend: number;
  trendLabel: string;
  href: string;
}) {
  const trendColor = trend > 0 ? "text-success" : trend < 0 ? "text-error" : "text-paper-muted";
  const trendText = trend === 0 ? `ללא שינוי ${trendLabel}` : `${Math.abs(trend)} ${trendLabel}`;
  return (
    <Link
      href={href}
      className="card flex items-center gap-2.5 p-2.5 transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold leading-tight text-paper-text">{value}</p>
        <p className="truncate text-xs text-paper-muted">{label}</p>
      </div>
      <p className={`flex shrink-0 items-center gap-0.5 self-start text-xs font-medium ${trendColor}`} title={trendText}>
        {trend > 0 && <ArrowUpIcon />}
        {trend < 0 && <ArrowDownIcon />}
        {trend !== 0 && Math.abs(trend)}
      </p>
    </Link>
  );
}

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
    case "created":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M7 3.5h7l3 3V20a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 13h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
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

function FormIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M4 12 20 4l-5 16-3-7-8-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12.3 11 14.8l4.5-5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
