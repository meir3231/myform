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
      <h1 className="mb-6 text-2xl font-bold text-slate-800">הגשות</h1>

      {!submissions || submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          עדיין אין הגשות. שלח טופס ללקוח מתוך עמוד הטפסים.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">לקוח</th>
                <th className="px-4 py-3 font-medium">טופס</th>
                <th className="px-4 py-3 font-medium">סטטוס</th>
                <th className="px-4 py-3 font-medium">נשלח</th>
                <th className="px-4 py-3 font-medium">הושלם</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((s) => {
                const meta = STATUS_META[s.status];
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{s.recipient_name}</div>
                      <div className="text-xs text-slate-400" dir="ltr">
                        {s.recipient_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formName.get(s.form_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.sent_at ? new Date(s.sent_at).toLocaleDateString("he-IL") : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.completed_at
                        ? new Date(s.completed_at).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/submissions/${s.id}`}
                        className="text-brand hover:underline"
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
