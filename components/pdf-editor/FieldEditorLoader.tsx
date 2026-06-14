"use client";

import dynamic from "next/dynamic";
import type { FieldDraft } from "@/lib/fields";

// react-pdf / pdfjs נטענים בצד לקוח בלבד (תלויים ב-DOM globals).
const FieldEditor = dynamic(() => import("./FieldEditor"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full gap-6" style={{ gridTemplateColumns: "170px minmax(400px,1fr) minmax(260px,292px)" }}>
      <div className="skeleton h-full w-full" />
      <div className="skeleton h-full w-full" />
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
