# MyForm — ניהול טפסי PDF דיגיטליים

מערכת לניהול, שליחה וחתימה של טפסי PDF דיגיטליים למשרד עורכי דין.

**הזרימה:** מנהל מעלה PDF → מגדיר שדות בעורך ויזואלי → שולח לינק אישי ללקוח →
הלקוח ממלא וחותם בדפדפן → המנהל רואה סטטוס ומוריד PDF חתום + תיעוד.

## טכנולוגיות
- **Next.js 15** (App Router, TypeScript, Tailwind) — frontend + backend
- **Supabase** — Postgres (עם RLS), Auth, Storage
- **pdf-lib** — הטבעת ערכים וחתימה על ה-PDF
- **react-pdf / pdfjs-dist** — רינדור PDF בדפדפן
- **Resend** — שליחת מיילים
- **פריסה:** Vercel + Supabase

## הקמה ראשונית

### 1. פרויקט Supabase
1. צור פרויקט חדש ב-[supabase.com](https://supabase.com).
2. מ-**Project Settings → API** העתק: `Project URL`, `anon key`, `service_role key`.
3. הרץ את המיגרציה: ב-Supabase **SQL Editor** הדבק את תוכן
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) והרץ.

### 2. Resend (מיילים)
1. צור חשבון ב-[resend.com](https://resend.com) וקבל API key.
2. אמת דומיין שליחה (או השתמש ב-`onboarding@resend.dev` לבדיקות).

### 3. משתני סביבה
העתק `.env.example` ל-`.env.local` ומלא את הערכים:

```bash
cp .env.example .env.local
```

צור סוד אקראי ל-`TOKEN_SIGNING_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. משתמש מנהל ראשון
```bash
node scripts/setup.mjs "שם המשרד" admin@example.com "סיסמה-חזקה" "שם מלא"
```

### 5. הרצה
```bash
npm install
npm run dev
```
פתח http://localhost:3000 והתחבר עם המשתמש שיצרת.

## מבנה
- `app/(auth)/login` — כניסת מנהל
- `app/(admin)/dashboard|forms|submissions` — אזור המנהל
- `app/fill/[token]` — דף מילוי ציבורי ללקוח (ללא הרשמה)
- `lib/supabase` — לקוחות Supabase (server/browser/admin)
- `lib/tokens.ts` — יצירה ואימות טוקני גישה
- `lib/pdf` — רינדור והשטחת PDF
- `supabase/migrations` — סכמה + RLS

## אבטחה
- גישת הלקוח לטופס היא דרך **טוקן אקראי** בלינק; ב-DB נשמר רק ה-HMAC-hash שלו.
- כל פעולות הלקוח עוברות דרך קוד שרת עם service role לאחר אימות הטוקן — הדפדפן של
  הלקוח לא ניגש ישירות ל-Supabase.
- RLS מגביל כל מנהל לנתוני הארגון שלו בלבד (`org_id`).
