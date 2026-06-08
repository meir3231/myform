"use client";

import dynamic from "next/dynamic";
import type { FieldDraft } from "@/lib/fields";

// react-pdf / pdfjs נטענים בצד לקוח בלבד (תלויים ב-DOM globals).
const FieldEditor = dynamic(() => import("./FieldEditor"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="space-y-4">
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-56 w-full" />
      </div>
      <div className="skeleton h-[34rem] w-full" />
    </div>
  ),
});

export function FieldEditorLoader(props: {
  formId: string;
  pdfUrl: string;
  pageCount: number;
  initialFields: FieldDraft[];
}) {
  return <FieldEditor {...props} />;
}
