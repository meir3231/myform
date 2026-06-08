// קריאה מרוכזת ובטוחה של משתני הסביבה. נכשל מוקדם עם הודעה ברורה אם חסר משתנה.

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `חסר משתנה סביבה: ${name}. ראה .env.example והגדר אותו ב-.env.local`
    );
  }
  return value;
}

// משתנים ציבוריים (נגישים גם בדפדפן)
export const PUBLIC_ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

// משתני שרת בלבד — לעולם לא לייבא לקוד שרץ בדפדפן
export function serverEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceRoleKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "TofSync <onboarding@resend.dev>",
    tokenSigningSecret: required("TOKEN_SIGNING_SECRET", process.env.TOKEN_SIGNING_SECRET),
    appUrl: PUBLIC_ENV.appUrl,
  };
}
