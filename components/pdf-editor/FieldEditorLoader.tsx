"use client";

import dynamic from "next/dynamic";
import type { FieldDraft } from "@/lib/fields";

// react-pdf / pdfjs נטענים בצד לקוח בלבד (תלויים ב-DOM globals).
const FieldEditor = dynamic(() => import("./FieldEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center text-slate-400">
      טוען עורך...
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
