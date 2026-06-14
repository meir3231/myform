import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditEventType, Database } from "@/lib/database.types";

// רושם אירוע ביומן הביקורת של הגשה (מי שלח/למי/מתי/ערוץ/נפתח/נחתם/בוטל).
// best-effort: כשל ברישום לא אמור להפיל את הפעולה הראשית.
export async function logSubmissionEvent(
  admin: SupabaseClient<Database>,
  params: {
    submissionId: string;
    orgId: string;
    eventType: AuditEventType;
    channel?: string | null;
    actorId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<void> {
  try {
    await admin.from("submission_audit_log").insert({
      submission_id: params.submissionId,
      org_id: params.orgId,
      event_type: params.eventType,
      channel: params.channel ?? null,
      actor_id: params.actorId ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });
  } catch {
    // לא קריטי
  }
}
