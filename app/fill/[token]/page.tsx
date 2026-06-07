import { loadSubmissionForFill } from "@/lib/submission-access";
import { FillerLoader } from "@/components/pdf-filler/FillerLoader";

// דף ציבורי — ללא אימות מנהל. הגישה דרך הטוקן בלבד.
export const dynamic = "force-dynamic";

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-500">{body}</p>
      </div>
    </main>
  );
}

export default async function FillPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await loadSubmissionForFill(token);

  if (result.status === "notfound") {
    return <Notice title="קישור לא תקין" body="הקישור שגוי או שאינו קיים." />;
  }
  if (result.status === "expired") {
    return (
      <Notice
        title="הקישור פג תוקף"
        body="פנה/י למשרד לקבלת קישור חדש למילוי הטופס."
      />
    );
  }
  if (result.status === "completed") {
    return (
      <Notice title="הטופס כבר מולא" body="הטופס הזה כבר נחתם והוגש. תודה." />
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <FillerLoader
        token={token}
        pdfUrl={result.pdfUrl}
        pageCount={result.pageCount}
        fields={result.fields}
        recipientName={result.recipientName}
        formName={result.formName}
      />
    </main>
  );
}
