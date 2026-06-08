import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
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
    .select("id, org_id, name")
    .eq("id", id)
    .single();

  if (!form || form.org_id !== profile.org_id) notFound();

  const { data: fields } = await supabase
    .from("form_fields")
    .select("id, page, type, label, required, sort_order")
    .eq("form_id", form.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/forms/${form.id}/edit`}
        className="mb-4 inline-block text-sm text-slate-500 hover:text-brand"
      >
        → חזרה לעורך
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-slate-800">שליחה ללקוח</h1>
      <p className="mb-6 text-slate-500">{form.name}</p>

      <SendForm formId={form.id} fields={fields ?? []} />
    </div>
  );
}
