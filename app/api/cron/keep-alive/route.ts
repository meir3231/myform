import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/keep-alive
// פינג יומי ל-Supabase (מתוזמן ע"י Vercel Cron, ראה vercel.json) כדי שהפרויקט
// לא יירדם / יוקפא אוטומטית בעקבות חוסר פעילות ב-API.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  await admin.from("profiles").select("id").limit(1);

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
