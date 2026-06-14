import { AdminShell } from "@/components/AdminShell";

// אזור הניהול עבור עורך השדות: אותו shell (header/sidebar) כמו (admin),
// אבל מקום תיבת החיפוש הגלובלית ב-header מוצג slot עם שני חלקים -
// כותרת (breadcrumb + שם הקובץ) וכפתורי השמירה/שליחה - שמוזרקים
// אליהם מ-FieldEditor.tsx.
export default function FormEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell
      headerCenter={
        <div className="header-editor-slot">
          <div id="header-editor-title" className="header-editor-title" />
          <div id="header-actions-slot" className="header-actions-slot" />
        </div>
      }
    >
      {children}
    </AdminShell>
  );
}
