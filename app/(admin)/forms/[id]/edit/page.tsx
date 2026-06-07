import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import type { FieldDraft } from "@/lib/fields";
import { FieldEditorLoader } from "@/components/pdf-editor/FieldEditorLoader";

export default async function EditFormPage({
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

  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", id)
    .order("sort_order", { ascending: true });

  const pdfUrl = await getSignedUrl("originals", form.original_pdf_path, 60 * 30);

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
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-brand">
            → חזרה לטפסים
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">{form.name}</h1>
        </div>
        <Link
          href={`/forms/${form.id}/send`}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
        >
          שליחה ללקוח →
        </Link>
      </div>

      <FieldEditorLoader
        formId={form.id}
        pdfUrl={pdfUrl}
        pageCount={form.page_count}
        initialFields={initialFields}
      />
    </div>
  );
}
