// Stepper תלת-שלבי לתהליך שליחת טופס (Phase 3, סעיף 13 ב-v2): h=48px
const STEPS = ["בחירת טופס", "פרטי הנמען", "אישור ושליחה"];

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex h-12 items-center">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done || active
                    ? "bg-brand text-white"
                    : "border border-border bg-white text-text-secondary"
                }`}
              >
                {done ? <CheckIcon /> : num}
              </span>
              <span
                className={`whitespace-nowrap text-sm font-medium ${
                  done || active ? "text-navy" : "text-text-secondary"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`mx-3 h-px flex-1 ${done ? "bg-brand" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
