import { loadSubmissionForFill } from "@/lib/submission-access";
import { FillerLoader } from "@/components/pdf-filler/FillerLoader";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";

// דף ציבורי — ללא אימות מנהל. הגישה דרך הטוקן בלבד.
export const dynamic = "force-dynamic";

// כותרת לקוח — h=64px (מובייל) / 72px (דסקטופ), לוגו קטן + שם הטופס.
// מופיעה גם בדפי הודעה וגם בדף המילוי, ללא ניווט (דף ציבורי).
function BrandBar({ formName }: { formName?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-paper-line bg-white/80 px-4 backdrop-blur-sm sm:h-[72px] sm:px-6">
      <BrandLogo size="sm" />
      {formName && (
        <span className="truncate text-sm font-semibold text-paper-text sm:text-base">
          {formName}
        </span>
      )}
    </header>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <BrandBar />
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="page-fade-in card w-full max-w-md p-8 text-center">
          <h1 className="mb-2 text-xl font-bold text-paper-text">{title}</h1>
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
    <div className="flex min-h-screen flex-col bg-paper">
      <BrandBar formName={result.formName} />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <FillerLoader
          token={token}
          pdfUrl={result.pdfUrl}
          pageCount={result.pageCount}
          fields={result.fields}
          initialValues={result.initialValues}
          recipientName={result.recipientName}
          formName={result.formName}
          orgName={result.orgName}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
