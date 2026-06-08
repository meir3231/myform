import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { STATUS_META } from "@/lib/status";

export default async function SubmissionsPage() {
  const { supabase } = await requireProfile();

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, recipient_name, recipient_email, status, sent_at, completed_at, form_id"
    )
    .order("created_at", { ascending: false });

  // מיפוי שמות הטפסים (ללא embed כדי לא להיות תלויים ב-relationship metadata)
  const formIds = [...new Set((submissions ?? []).map((s) => s.form_id))];
  const { data: forms } = formIds.length
    ? await supabase.from("forms").select("id, name").in("id", formIds)
    : { data: [] };
  const formName = new Map((forms ?? []).map((f) => [f.id, f.name]));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-text">הגשות</h1>

      {!submissions || submissions.length === 0 ? (
        <div className="card-dark border-dashed p-12 text-center text-ink-muted">
          עדיין אין הגשות. שלח טופס ללקוח מתוך עמוד הטפסים.
        </div>
      ) : (
        <div className="card-dark overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">לקוח</th>
                <th className="px-4 py-3 font-medium">טופס</th>
                <th className="px-4 py-3 font-medium">סטטוס</th>
                <th className="px-4 py-3 font-medium">נשלח</th>
                <th className="px-4 py-3 font-medium">הושלם</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {submissions.map((s, i) => {
                const meta = STATUS_META[s.status];
                return (
                  <tr
                    key={s.id}
                    className={`stagger-item transition hover:bg-white/5 ${
                      i % 2 === 1 ? "bg-white/[0.02]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-text">{s.recipient_name}</div>
                      <div className="text-xs text-ink-muted" dir="ltr">
                        {s.recipient_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {formName.get(s.form_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge badge-dot ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {s.sent_at ? new Date(s.sent_at).toLocaleDateString("he-IL") : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {s.completed_at
                        ? new Date(s.completed_at).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/submissions/${s.id}`}
                        className="font-medium text-brand-light transition hover:underline"
                      >
                        פרטים
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
