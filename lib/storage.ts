import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// מפיק signed URL זמני לקובץ ב-bucket פרטי. שרת בלבד.
export async function getSignedUrl(
  bucket: "originals" | "completed" | "signatures",
  path: string,
  expiresInSeconds = 60 * 10
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new Error("יצירת קישור לקובץ נכשלה: " + error?.message);
  return data.signedUrl;
}

// מוריד קובץ כ-bytes מ-bucket פרטי. שרת בלבד.
export async function downloadFile(
  bucket: "originals" | "completed" | "signatures",
  path: string
): Promise<Uint8Array> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) throw new Error("הורדת הקובץ נכשלה: " + error?.message);
  return new Uint8Array(await data.arrayBuffer());
}
