import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";

// GET /api/download-completed?token=...
// מחזיר את ה-PDF המוסרק ישירות מ-storage ללא signed URL
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return new NextResponse("Missing token", { status: 400 });

  const admin = createAdminClient();
  const tokenHash = hashToken(token);

  const { data: sub } = await admin
    .from("submissions")
    .select("id, status, completed_pdf_path, recipient_name")
    .eq("token_hash", tokenHash)
    .single();

  if (!sub || sub.status !== "completed" || !sub.completed_pdf_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("completed")
    .download(sub.completed_pdf_path);

  if (error || !data) {
    return new NextResponse("Download failed", { status: 500 });
  }

  const fileName = `טופס-חתום-${sub.recipient_name ?? "לקוח"}.pdf`
    .replace(/[^֐-׿\w\s\-\.]/g, "")
    .trim();

  const bytes = await data.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
