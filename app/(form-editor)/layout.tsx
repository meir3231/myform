import { AdminShell } from "@/components/AdminShell";

// אזור הניהול עבור עורך השדות: אותו shell (header/sidebar) כמו (admin),
// אבל סלוט המרכז ב-header מציג גם את כותרת העמוד (breadcrumb + שם הקובץ)
// וגם כפתורי שמירה/שליחה - שמוזרקים אליהם מ-FieldEditor.tsx.
export default function FormEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell
      headerCenter={
        <div className="page-heading-slot">
          <div id="header-page-title" />
          <div id="header-actions-slot" className="header-actions-slot" />
        </div>
      }
    >
      {children}
    </AdminShell>
  );
}
