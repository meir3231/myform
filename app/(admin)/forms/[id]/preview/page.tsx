import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import type { FieldDraft } from "@/lib/fields";
import { AdminPreviewFiller } from "@/components/pdf-filler/AdminPreviewFiller";
import { PageHeading } from "@/components/PageHeading";

export default async function PreviewFormPage({
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
    supabase.from("form_fields").select("*").eq("form_id", id).order("sort_order", { ascending: true }),
    getSignedUrl("originals", form.original_pdf_path, 60 * 30),
  ]);

  const initialFields: FieldDraft[] = (fields ?? []).map((f) => ({
    id: f.id,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    type: f.type,
    label: f.label,
    required: f.required,
    font_size: f.font_size,
    copyFrom: f.copy_from_field_id,
  }));

  return (
    <div className="page-fade-in">
      <PageHeading
        crumbs={[
          { label: "תבניות", href: "/templates" },
          { label: form.name, href: `/forms/${form.id}/edit` },
        ]}
        title="תצוגה מקדימה"
      />

      <AdminPreviewFiller
        formId={form.id}
        pdfUrl={pdfUrl}
        pageCount={form.page_count}
        fields={initialFields}
      />
    </div>
  );
}
