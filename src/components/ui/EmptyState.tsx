import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 animate-pulse-dot rounded-2xl bg-phosphor/10 blur-xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800">
          <Icon size={22} className="text-phosphor-soft" />
        </div>
      </div>
      <h3 className="font-display text-base font-semibold text-ink-50">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-200">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="tick-label mb-2">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-50">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-200">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="tick-label">{children}</h2>
      {right}
    </div>
  );
}
