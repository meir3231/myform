import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env";

// טוקן גישת לקוח: מחרוזת אקראית שנשלחת בלינק. ב-DB נשמר רק ה-hash (HMAC-SHA256
// עם TOKEN_SIGNING_SECRET כ-pepper), כך שדליפת DB אינה מאפשרת לשחזר טוקנים.

export function generateToken(): string {
  // 32 בייטים אקראיים → 43 תווי base64url. קשה מאוד לניחוש.
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  const { tokenSigningSecret } = serverEnv();
  return createHmac("sha256", tokenSigningSecret).update(token).digest("hex");
}

// השוואה בזמן קבוע נגד timing attacks.
export function tokenMatchesHash(token: string, hash: string): boolean {
  const computed = hashToken(token);
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
