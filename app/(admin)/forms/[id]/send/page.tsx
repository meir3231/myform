import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SendForm } from "./send-form";

export default async function SendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data: form } = await supabase
    .from("forms")
    .select("id, org_id, name, original_pdf_path, page_count")
    .eq("id", id)
    .single();

  if (!form || form.org_id !== profile.org_id) notFound();

  const [{ data: fields }, pdfUrl] = await Promise.all([
    supabase.from("form_fields").select("id, page, type, label, required, sort_order").eq("form_id", form.id).order("sort_order", { ascending: true }),
    getSignedUrl("originals", form.original_pdf_path, 60 * 30),
  ]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <Breadcrumbs
          items={[
            { label: "תבניות", href: "/templates" },
            { label: form.name, href: `/forms/${form.id}/edit` },
            { label: "שליחה ללקוח" },
          ]}
        />
        <h1 className="mb-1 text-2xl font-bold text-slate-800">שליחה ללקוח</h1>
        <p className="mb-4 text-slate-500">{form.name}</p>
      </div>

      <div className="min-h-0 flex-1">
        <SendForm
          formId={form.id}
          fields={fields ?? []}
          pdfUrl={pdfUrl}
          pageCount={form.page_count}
        />
      </div>
    </div>
  );
}
