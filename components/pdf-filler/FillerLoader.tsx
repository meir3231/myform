"use client";

import dynamic from "next/dynamic";
import type { FieldDraft } from "@/lib/fields";

const FormFiller = dynamic(() => import("./FormFiller"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center text-slate-400">
      טוען טופס...
    </div>
  ),
});

export function FillerLoader(props: {
  token: string;
  pdfUrl: string;
  pageCount: number;
  fields: FieldDraft[];
  initialValues: Record<string, string>;
  recipientName: string;
  formName: string;
}) {
  return <FormFiller {...props} />;
}
