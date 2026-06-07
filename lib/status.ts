import type { SubmissionStatus } from "@/lib/database.types";

// תווית וצבע לכל סטטוס שליחה.
export const STATUS_META: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  pending: { label: "נשלח — ממתין", className: "bg-amber-100 text-amber-800" },
  opened: { label: "נפתח", className: "bg-blue-100 text-blue-800" },
  completed: { label: "הושלם", className: "bg-green-100 text-green-800" },
  expired: { label: "פג תוקף", className: "bg-slate-200 text-slate-600" },
};
