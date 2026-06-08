// סמל המותג: דף/טופס (קווי טקסט) + ניצוץ סגול — משלב "טופס" ו"חדשנות".
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="3" width="13" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.3 8h6.4M7.3 11.5h6.4M7.3 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18.3 12.2l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2Z" fill="#c4abff" />
    </svg>
  );
}

type LogoSize = "sm" | "lg" | "xl";

const SIZE_MAP: Record<LogoSize, { badge: string; icon: string; text: string }> = {
  sm: { badge: "h-8 w-8 rounded-lg", icon: "h-4 w-4", text: "text-base" },
  lg: { badge: "h-9 w-9 rounded-lg", icon: "h-5 w-5", text: "text-xl" },
  xl: { badge: "h-12 w-12 rounded-xl", icon: "h-6 w-6", text: "text-2xl" },
};

export function BrandLogo({
  size = "lg",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  const s = SIZE_MAP[size];
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span
        className={`flex shrink-0 items-center justify-center ${s.badge} bg-brand text-white shadow-sm transition group-hover:bg-brand-dark`}
      >
        <LogoMark className={s.icon} />
      </span>
      <span className={`font-bold tracking-tight text-brand ${s.text}`}>Smart Form</span>
    </span>
  );
}
