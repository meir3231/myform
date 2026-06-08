import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import { STATUS_META } from "@/lib/status";
import { Breadcrumbs } from "@/components/Breadcrumbs";

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

  const { data: form } = await supabase
    .from("forms")
    .select("name")
    .eq("id", sub.form_id)
    .single();

  const { data: fields } = await supabase
    .from("form_fields")
    .select("id, label, type, sort_order")
    .eq("form_id", sub.form_id)
    .order("sort_order", { ascending: true });

  const { data: values } = await supabase
    .from("submission_values")
    .select("field_id, value")
    .eq("submission_id", id);
  const valueMap = new Map((values ?? []).map((v) => [v.field_id, v.value]));

  const { data: audit } = await supabase
    .from("signature_audit")
    .select("*")
    .eq("submission_id", id)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const meta = STATUS_META[sub.status];
  const downloadUrl = sub.completed_pdf_path
    ? await getSignedUrl("completed", sub.completed_pdf_path, 60 * 10)
    : null;

  return (
    <div className="page-fade-in mx-auto max-w-4xl">
      <Breadcrumbs
        dark
        items={[
          { label: "הגשות", href: "/submissions" },
          { label: sub.recipient_name },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-text">{sub.recipient_name}</h1>
          <p className="text-ink-muted">
            {form?.name} ·{" "}
            <span dir="ltr" className="text-sm">
              {sub.recipient_email}
            </span>
          </p>
        </div>
        <span className={`badge badge-dot text-sm ${meta.className}`}>
          {meta.label}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ערכים שמולאו */}
        <section className="card-dark p-5">
          <h2 className="mb-3 font-semibold text-ink-text">תוכן הטופס</h2>
          {sub.status !== "completed" ? (
            <p className="text-sm text-ink-muted">הטופס עדיין לא הושלם.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              {(fields ?? []).map((f) => {
                const raw = valueMap.get(f.id);
                const isSig = f.type === "signature" || f.type === "initials";
                return (
                  <div key={f.id} className="flex justify-between gap-4 border-b border-ink-line pb-2">
                    <dt className="text-ink-muted">{f.label || f.type}</dt>
                    <dd className="text-ink-text">
                      {isSig ? (raw ? "נחתם ✓" : "—") : raw || "—"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </section>

        {/* תיעוד + הורדה */}
        <section className="card-dark p-5">
          <h2 className="mb-3 font-semibold text-ink-text">תיעוד וחתימה</h2>
          {sub.status === "completed" && audit ? (
            <dl className="space-y-2 text-sm">
              <Row label="נחתם בתאריך" value={new Date(audit.signed_at).toLocaleString("he-IL")} />
              <Row label="כתובת IP" value={audit.signer_ip || "—"} ltr />
              <Row label="טביעת מסמך (SHA-256)" value={audit.doc_sha256} mono />
            </dl>
          ) : (
            <p className="text-sm text-ink-muted">אין תיעוד — הטופס לא נחתם עדיין.</p>
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

      {/* תצוגה מקדימה */}
      {downloadUrl && (
        <section className="card-dark mt-6 p-5">
          <h2 className="mb-3 font-semibold text-ink-text">תצוגה מקדימה</h2>
          <iframe
            src={downloadUrl}
            className="h-[800px] w-full rounded-lg border border-ink-line"
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
    <div className="flex justify-between gap-4 border-b border-ink-line pb-2">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd
        className={`break-all text-ink-text ${mono ? "font-mono text-xs" : ""}`}
        dir={ltr || mono ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
