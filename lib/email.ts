import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";

// אם אין מפתח Resend מוגדר — לא שולחים בפועל (נוח לפיתוח), רק מחזירים sent:false.
function getResend(): Resend | null {
  const { resendApiKey } = serverEnv();
  if (!resendApiKey) return null;
  return new Resend(resendApiKey);
}

// מייל ללקוח עם הלינק האישי למילוי הטופס.
export async function sendFormLinkEmail(opts: {
  to: string;
  recipientName: string;
  formName: string;
  link: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { sent: false, error: "RESEND_API_KEY לא מוגדר" };

  const { emailFrom } = serverEnv();
  const { error } = await resend.emails.send({
    from: emailFrom,
    to: opts.to,
    subject: `טופס לחתימה: ${opts.formName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;line-height:1.6">
        <p>שלום ${escapeHtml(opts.recipientName)},</p>
        <p>התקבל עבורך טופס למילוי וחתימה: <strong>${escapeHtml(opts.formName)}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${opts.link}" style="background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            פתיחת הטופס
          </a>
        </p>
        <p style="font-size:13px;color:#64748b">אם הכפתור אינו עובד, העתק את הקישור:<br/>${escapeHtml(opts.link)}</p>
      </div>
    `,
  });

  if (error) return { sent: false, error: error.message };
  return { sent: true };
}

// מייל התראה למנהל כשטופס הושלם.
export async function sendCompletionNotice(opts: {
  to: string;
  formName: string;
  recipientName: string;
  reviewLink: string;
}): Promise<{ sent: boolean }> {
  const resend = getResend();
  if (!resend) return { sent: false };

  const { emailFrom } = serverEnv();
  await resend.emails.send({
    from: emailFrom,
    to: opts.to,
    subject: `טופס הושלם: ${opts.formName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;line-height:1.6">
        <p>${escapeHtml(opts.recipientName)} השלים/ה את הטופס <strong>${escapeHtml(opts.formName)}</strong>.</p>
        <p><a href="${opts.reviewLink}">צפייה והורדת ה-PDF החתום</a></p>
      </div>
    `,
  });
  return { sent: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
