import { useStore } from "@/store/useStore";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
      <div className="panel flex items-center gap-3 px-4 py-3 shadow-panel ring-1 ring-phosphor/30 animate-rise">
        <CheckCircle2 size={18} className="text-phosphor-soft" />
        <span className="text-sm text-ink-50">{toast}</span>
      </div>
    </div>
  );
}

export { Info, AlertTriangle };
