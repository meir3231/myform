import type { AuditEventType, SubmissionStatus } from "@/lib/database.types";

// תווית וצבע לכל סטטוס שליחה.
export const STATUS_META: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  pending: { label: "נשלח — ממתין", className: "bg-amber-200 text-amber-900" },
  opened: { label: "נפתח", className: "bg-orange-100 text-orange-700" },
  completed: { label: "הושלם", className: "bg-green-100 text-green-700" },
  expired: { label: "פג תוקף", className: "bg-slate-200 text-slate-600" },
};

// תוויות וצבעים ליומן הביקורת של הגשה (סעיף 12 ב-v2 / Phase 12).
export const AUDIT_EVENT_META: Record<AuditEventType, { label: string; color: string }> = {
  sent: { label: "הטופס נשלח ללקוח", color: "#14B8A6" },
  resent: { label: "תזכורת נשלחה ללקוח", color: "#14B8A6" },
  opened: { label: "הלקוח פתח את הטופס", color: "#3B82F6" },
  completed: { label: "הלקוח השלים ונחתם הטופס", color: "#22C55E" },
  link_cancelled: { label: "הקישור בוטל", color: "#EF4444" },
  expired: { label: "הקישור פג תוקף", color: "#64748B" },
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "אימייל",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export function channelLabel(channel: string | null): string | null {
  if (!channel) return null;
  return CHANNEL_LABELS[channel] ?? channel;
}
