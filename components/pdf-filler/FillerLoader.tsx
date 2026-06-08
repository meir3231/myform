"use client";

import dynamic from "next/dynamic";
import type { FieldDraft } from "@/lib/fields";

const FormFiller = dynamic(() => import("./FormFiller"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="skeleton h-8 w-1/3" />
      <div className="skeleton h-[28rem] w-full" />
      <div className="flex justify-end gap-2">
        <div className="skeleton h-10 w-28" />
      </div>
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
