import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import { AUDIT_EVENT_META, STATUS_META, channelLabel } from "@/lib/status";
import { PageHeading } from "@/components/PageHeading";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: sub } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (!sub || sub.org_id !== profile.org_id) notFound();

  const [{ data: form }, { data: fields }, { data: values }, { data: audit }, { data: auditLog }, { data: profiles }, downloadUrl] =
    await Promise.all([
      supabase.from("forms").select("name").eq("id", sub.form_id).single(),
      supabase.from("form_fields").select("id, label, type, sort_order").eq("form_id", sub.form_id).order("sort_order", { ascending: true }),
      supabase.from("submission_values").select("field_id, value").eq("submission_id", id),
      supabase.from("signature_audit").select("*").eq("submission_id", id).order("signed_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("submission_audit_log").select("*").eq("submission_id", id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("org_id", profile.org_id),
      sub.completed_pdf_path ? getSignedUrl("completed", sub.completed_pdf_path, 60 * 10) : Promise.resolve(null),
    ]);

  const valueMap = new Map((values ?? []).map((v) => [v.field_id, v.value]));
  const actorName = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]));
  const meta = STATUS_META[sub.status];

  return (
    <div className="page-fade-in mx-auto max-w-4xl">
      <PageHeading
        crumbs={[{ label: "מעקב שליחות", href: "/tracking" }]}
        title={sub.recipient_name}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-paper-muted">
          {form?.name} ·{" "}
          <span dir="ltr" className="text-sm">
            {sub.recipient_email}
          </span>
        </p>
        <span className={`badge badge-dot text-sm ${meta.className}`}>
          {meta.label}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ערכים שמולאו */}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-paper-text">תוכן הטופס</h2>
          {sub.status !== "completed" ? (
            <p className="text-sm text-paper-muted">הטופס עדיין לא הושלם.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              {(fields ?? []).map((f) => {
                const raw = valueMap.get(f.id);
                const isSig = f.type === "signature" || f.type === "initials";
                const isCheckbox = f.type === "checkbox";
                const displayValue = isSig
                  ? (raw ? "נחתם ✓" : <span className="text-slate-400">לא נחתם</span>)
                  : isCheckbox
                  ? (raw === "true" ? "מסומן ✓" : <span className="text-slate-400">לא מסומן</span>)
                  : raw
                  ? raw
                  : <span className="text-slate-400">לא מולא</span>;
                return (
                  <div key={f.id} className="flex justify-between gap-4 border-b border-paper-line pb-2">
                    <dt className="text-paper-muted">{f.label || f.type}</dt>
                    <dd className="text-paper-text">{displayValue}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </section>

        {/* תיעוד + הורדה */}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-paper-text">תיעוד וחתימה</h2>
          {sub.status === "completed" && audit ? (
            <dl className="space-y-2 text-sm">
              <Row label="נחתם בתאריך" value={new Date(audit.signed_at).toLocaleString("he-IL")} />
              <Row label="כתובת IP" value={audit.signer_ip || "—"} ltr />
              <Row label="טביעת מסמך (SHA-256)" value={audit.doc_sha256} mono />
            </dl>
          ) : (
            <p className="text-sm text-paper-muted">אין תיעוד — הטופס לא נחתם עדיין.</p>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-4 inline-flex"
            >
              הורדת ה-PDF החתום
            </a>
          )}
        </section>
      </div>

      {/* יומן ביקורת */}
      <section className="card mt-6 p-5">
        <h2 className="mb-3 font-semibold text-paper-text">יומן ביקורת</h2>
        {!auditLog || auditLog.length === 0 ? (
          <p className="text-sm text-paper-muted">אין עדיין רשומות ביומן הביקורת.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {auditLog.map((entry) => {
              const evMeta = AUDIT_EVENT_META[entry.event_type];
              const channel = channelLabel(entry.channel);
              const actor = entry.actor_id ? actorName.get(entry.actor_id) : null;
              return (
                <li key={entry.id} className="flex items-start gap-3 border-b border-soft-border pb-3 last:border-0 last:pb-0">
                  <span
                    className="mt-0.5 flex h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: evMeta.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-paper-text">
                      {evMeta.label}
                      {channel ? ` · ${channel}` : ""}
                      {actor ? ` · ע״י ${actor}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-paper-muted">
                      {new Date(entry.created_at).toLocaleString("he-IL")}
                      {entry.ip_address ? ` · ${entry.ip_address}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* תצוגה מקדימה */}
      {downloadUrl && (
        <section className="card mt-6 p-5">
          <h2 className="mb-3 font-semibold text-paper-text">תצוגה מקדימה</h2>
          <iframe
            src={downloadUrl}
            className="h-[70vh] w-full rounded-lg border border-paper-line"
            title="PDF חתום"
          />
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  ltr,
  mono,
}: {
  label: string;
  value: string;
  ltr?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-paper-line pb-2">
      <dt className="shrink-0 text-paper-muted">{label}</dt>
      <dd
        className={`break-all text-paper-text ${mono ? "font-mono text-xs" : ""}`}
        dir={ltr || mono ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
