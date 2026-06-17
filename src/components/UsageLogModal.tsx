import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Modal } from "@/components/ui/Modal";
import type { InstrumentHealth, Reservation } from "@/types";
import { ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function UsageLogModal({
  open,
  onClose,
  reservation,
}: {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}) {
  const instruments = useStore((s) => s.instruments);
  const submitUsageLog = useStore((s) => s.submitUsageLog);

  const [actual, setActual] = useState(reservation?.durationHours ?? 1);
  const [status, setStatus] = useState<InstrumentHealth>("normal");
  const [anomaly, setAnomaly] = useState("");
  const [consumables, setConsumables] = useState("");

  if (!reservation) return null;
  const instrument = instruments.find((i) => i.id === reservation.instrumentId)!;

  const handleSubmit = () => {
    submitUsageLog({
      reservationId: reservation.id,
      instrumentId: reservation.instrumentId,
      actualDurationHours: actual,
      instrumentStatus: status,
      anomaly: anomaly.trim() || "无",
      consumables: consumables.trim() || "无",
    });
    onClose();
  };

  const healthOptions: { value: InstrumentHealth; label: string; tone: string }[] = [
    { value: "normal", label: "运行正常", tone: "border-emeraldph/40 text-emeraldph bg-emeraldph/10" },
    { value: "minor_issue", label: "轻微异常", tone: "border-amberph/40 text-amberph bg-amberph/10" },
    { value: "fault", label: "故障报修", tone: "border-roseph/40 text-roseph bg-roseph/10" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="填写使用日志"
      subtitle={`${instrument.name} · 预计 ${reservation.durationHours} 小时`}
      size="md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSubmit}>
            <ClipboardCheck size={15} />
            提交日志
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block tick-label">实际使用时长</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.5}
              max={Math.max(reservation.durationHours + 2, 8)}
              step={0.25}
              value={actual}
              onChange={(e) => setActual(Number(e.target.value))}
              className="flex-1 accent-phosphor"
            />
            <span className="w-16 rounded-md border border-ink-600 bg-ink-900/60 px-2 py-1 text-right font-mono text-sm text-phosphor-soft">
              {actual}h
            </span>
          </div>
        </label>

        <div>
          <span className="mb-2 block tick-label">仪器使用后状态</span>
          <div className="grid grid-cols-3 gap-2">
            {healthOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                  status === opt.value
                    ? opt.tone
                    : "border-ink-600 text-ink-200 hover:bg-ink-700/50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block tick-label">异常情况描述</span>
          <textarea
            className="input min-h-[72px] resize-none"
            placeholder={status === "normal" ? "无异常可留空…" : "请描述异常现象、发生时间与已采取措施"}
            value={anomaly}
            onChange={(e) => setAnomaly(e.target.value)}
            maxLength={300}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block tick-label">耗材与消耗记录</span>
          <input
            className="input"
            placeholder="如：液氮 2L、载玻片 5 片…"
            value={consumables}
            onChange={(e) => setConsumables(e.target.value)}
          />
        </label>
      </div>
    </Modal>
  );
}
