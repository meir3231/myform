import Image from "next/image";

type LogoSize = "sm" | "lg" | "xl";

const SIZE_MAP: Record<LogoSize, { icon: number; text: string }> = {
  sm: { icon: 32, text: "text-base" },
  lg: { icon: 36, text: "text-xl" },
  xl: { icon: 48, text: "text-2xl" },
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
      <span className={`font-bold tracking-tight text-brand ${s.text}`}>TofSync</span>
      <Image src="/logo-icon.png" alt="" width={s.icon} height={s.icon} className="shrink-0" priority />
    </span>
  );
}
