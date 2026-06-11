type DonutSlice = { label: string; value: number; color: string };

// תרשים עוגה (donut) מותאם אישית ב-SVG, ללא ספריית גרפים חיצונית.
export function DonutChart({ data, total, size = 160 }: { data: DonutSlice[]; total: number; size?: number }) {
  const strokeWidth = size / 7.3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex min-h-0 flex-1 items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const dashOffset = -offset * circumference;
            offset += fraction;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-paper-text">{total}</span>
          <span className="text-[10px] text-paper-muted">סה״כ הגשות</span>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-paper-text">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="shrink-0 text-paper-muted">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type TrendPoint = { label: string; count: number };

// תרשים קו מותאם אישית ב-SVG עבור מגמת הגשות שבועית.
export function WeeklyTrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 95 - (d.count / max) * 85,
  }));
  const pathD = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const areaD = `${pathD} L100,100 L0,100 Z`;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full min-h-[64px] w-full">
        <path d={areaD} fill="rgba(20,184,166,0.08)" stroke="none" />
        <path d={pathD} fill="none" stroke="#14B8A6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.6" fill="#14B8A6" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-2 flex shrink-0 justify-between text-xs text-paper-muted">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
