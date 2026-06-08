import { loadSubmissionForFill } from "@/lib/submission-access";
import { FillerLoader } from "@/components/pdf-filler/FillerLoader";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";

// דף ציבורי — ללא אימות מנהל. הגישה דרך הטוקן בלבד.
export const dynamic = "force-dynamic";

// פס מיתוג מינימלי — מופיע גם בדפי הודעה וגם בדף המילוי, ללא ניווט (דף ציבורי).
function BrandBar() {
  return (
    <header className="border-b border-slate-200/60 bg-white/70 px-4 py-3 backdrop-blur-sm">
      <BrandLogo size="sm" />
    </header>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 to-slate-200/70">
      <BrandBar />
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="page-fade-in card w-full max-w-md p-8 text-center">
          <h1 className="mb-2 text-xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500">{body}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
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
    <div className="flex min-h-screen flex-col bg-slate-100">
      <BrandBar />
      <main className="flex-1 px-4 py-6">
        <FillerLoader
          token={token}
          pdfUrl={result.pdfUrl}
          pageCount={result.pageCount}
          fields={result.fields}
          initialValues={result.initialValues}
          recipientName={result.recipientName}
          formName={result.formName}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
