import { cn } from "@/lib/utils";
import type { StatusMeta } from "@/lib/status";

export function StatusDot({ className, pulse }: { className?: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", className)} />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", className)} />
    </span>
  );
}

export function StatusBadge({
  meta,
  pulse,
  className,
}: {
  meta: StatusMeta;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("chip", meta.bg, meta.text, meta.ring, className)}>
      <StatusDot className={meta.dot} pulse={pulse} />
      {meta.label}
    </span>
  );
}

export function Chip({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "phosphor" | "amber" | "violet" | "sky";
}) {
  const tones: Record<string, string> = {
    default: "bg-ink-700/50 text-ink-100 ring-ink-500",
    phosphor: "bg-phosphor/10 text-phosphor-soft ring-phosphor/30",
    amber: "bg-amberph/10 text-amberph ring-amberph/30",
    violet: "bg-violeph/10 text-violeph ring-violeph/30",
    sky: "bg-skyph/10 text-skyph ring-skyph/30",
  };
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}
