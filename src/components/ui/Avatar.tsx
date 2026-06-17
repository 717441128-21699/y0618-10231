import { cn } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = 32,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const initials = name.slice(-2);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-ink-950 ring-1 ring-inset ring-white/10",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        fontSize: size * 0.36,
      }}
      title={name}
    >
      {initials}
    </span>
  );
}

export function GroupTag({ shortName, color }: { shortName: string; color: string }) {
  return (
    <span
      className="chip"
      style={{
        color,
        background: `${color}1a`,
        boxShadow: `inset 0 0 0 1px ${color}55`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {shortName}
    </span>
  );
}
