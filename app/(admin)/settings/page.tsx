import { requireProfile } from "@/lib/auth";

export default async function SettingsPage() {
  const { user, profile, supabase } = await requireProfile();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, created_at")
    .eq("id", profile.org_id)
    .single();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-paper-text">הגדרות</h1>

      <div className="space-y-4">
        <section className="card p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-paper-text">פרטי משתמש</h2>
          <dl className="space-y-3 text-sm">
            <Row label="שם מלא" value={profile.full_name || "—"} />
            <Row label="אימייל" value={user.email ?? "—"} ltr />
            <Row label="תפקיד" value={profile.role} />
          </dl>
        </section>

        <section className="card p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-paper-text">פרטי הארגון</h2>
          <dl className="space-y-3 text-sm">
            <Row label="שם הארגון" value={org?.name || "—"} />
            {org?.created_at && (
              <Row label="נוצר בתאריך" value={new Date(org.created_at).toLocaleDateString("he-IL")} />
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-paper-line pb-3 last:border-0 last:pb-0">
      <dt className="text-paper-muted">{label}</dt>
      <dd className="text-paper-text" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
