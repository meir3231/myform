"use client";

import dynamic from "next/dynamic";
import type { FieldDraft } from "@/lib/fields";

// react-pdf / pdfjs נטענים בצד לקוח בלבד (תלויים ב-DOM globals).
const FieldEditor = dynamic(() => import("./FieldEditor"), {
  ssr: false,
  loading: () => (
    <div className="editor-grid h-full">
      <div className="skeleton hidden h-full w-full min-[1200px]:block" />
      <div className="skeleton h-full w-full" />
    </div>
  ),
});

export function FieldEditorLoader(props: {
  formId: string;
  formName: string;
  pdfUrl: string;
  pageCount: number;
  initialFields: FieldDraft[];
}) {
  return <FieldEditor {...props} />;
}
