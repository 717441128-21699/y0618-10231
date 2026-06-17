import { cn } from "@/lib/utils";

export function Ring({
  value,
  size = 56,
  stroke = 6,
  color = "#2DD4BF",
  track = "#232B36",
  label,
  sublabel,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="font-mono text-sm font-semibold text-ink-50">{label}</span>}
        {sublabel && <span className="text-[9px] uppercase tracking-wider text-ink-300">{sublabel}</span>}
      </div>
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  color = "#2DD4BF",
  track = "#1A212B",
  height = 8,
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  track?: string;
  height?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full", className)}
      style={{ height, background: track }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          boxShadow: `0 0 12px ${color}55`,
          transition: "width 0.7s cubic-bezier(0.2,0.7,0.2,1)",
        }}
      />
    </div>
  );
}
