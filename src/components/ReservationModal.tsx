import { useMemo, useState } from "react";
import { useStore, isUserQualified } from "@/store/useStore";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Badge";
import { ShieldAlert, ShieldCheck, Clock, FileText, FlaskConical } from "lucide-react";
import { addHours, formatTime, parseISO, toISO, addDays, dayKey } from "@/lib/date";
import type { Instrument } from "@/types";
import { cn } from "@/lib/utils";

export interface ReservationTarget {
  instrumentId: string;
  date?: Date;
  startHour?: number;
  durationHours?: number;
}

export function ReservationModal({
  open,
  onClose,
  target,
}: {
  open: boolean;
  onClose: () => void;
  target: ReservationTarget;
}) {
  const instruments = useStore((s) => s.instruments);
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  const qualificationRecords = useStore((s) => s.qualificationRecords);
  const qualifications = useStore((s) => s.qualifications);
  const createReservation = useStore((s) => s.createReservation);

  const initialInstrument = instruments.find((i) => i.id === target.instrumentId) ?? instruments[0];
  const [instrumentId, setInstrumentId] = useState(initialInstrument.id);
  const [dateStr, setDateStr] = useState(
    target.date ? dayKey(target.date) : dayKey(addDays(new Date(), 1)),
  );
  const [startHour, setStartHour] = useState(target.startHour ?? initialInstrument.dailyOpenHour);
  const [duration, setDuration] = useState(target.durationHours ?? 2);
  const [purpose, setPurpose] = useState("");

  const instrument: Instrument = instruments.find((i) => i.id === instrumentId) ?? initialInstrument;

  const qualified = useMemo(
    () => isUserQualified(qualificationRecords, currentUser.id, instrument.qualificationIds),
    [qualificationRecords, currentUser.id, instrument.qualificationIds],
  );

  const requiredQuals = qualifications.filter((q) => instrument.qualificationIds.includes(q.id));

  const startISO = `${dateStr}T${String(startHour).padStart(2, "0")}:00`;
  const endISO = toISO(addHours(parseISO(startISO), duration));

  const hourOptions: number[] = [];
  for (let h = instrument.dailyOpenHour; h < instrument.dailyCloseHour; h += 1) hourOptions.push(h);
  const durationOptions = [0.5, 1, 1.5, 2, 3, 4, 5, 6];

  const handleSubmit = () => {
    if (!purpose.trim()) return;
    createReservation({
      instrumentId,
      start: startISO,
      end: endISO,
      purpose: purpose.trim(),
      durationHours: duration,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="提交预约申请"
      subtitle="选择仪器与时段，填写实验用途后提交"
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={!purpose.trim()} onClick={handleSubmit}>
            <FlaskConical size={15} />
            提交预约
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="目标仪器">
            <select
              className="input"
              value={instrumentId}
              onChange={(e) => setInstrumentId(e.target.value)}
              disabled={!!target.instrumentId}
            >
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} · {i.code}
                </option>
              ))}
            </select>
          </Field>

          <Field label="实验日期">
            <input
              type="date"
              className="input"
              value={dateStr}
              min={dayKey(new Date())}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </Field>

          <Field label="开始时间">
            <select className="input" value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </Field>

          <Field label="预计时长">
            <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {durationOptions.map((d) => (
                <option key={d} value={d}>
                  {d} 小时
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/50 px-3 py-2.5 text-sm">
          <Clock size={14} className="text-phosphor-soft" />
          <span className="text-ink-200">预约时段</span>
          <span className="ml-auto font-mono text-ink-50">
            {formatTime(startISO)} – {formatTime(endISO)}
          </span>
        </div>

        <Field label="实验用途（必填）">
          <textarea
            className="input min-h-[88px] resize-none"
            placeholder="请简要描述实验目的、样品类型与预期测试参数…"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            maxLength={200}
          />
          <p className="mt-1 text-right text-[10px] text-ink-300">{purpose.length}/200</p>
        </Field>

        {instrument.requiresQualification && (
          <div
            className={cn(
              "rounded-lg border p-3",
              qualified ? "border-emeraldph/30 bg-emeraldph/5" : "border-amberph/30 bg-amberph/5",
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              {qualified ? (
                <ShieldCheck size={15} className="text-emeraldph" />
              ) : (
                <ShieldAlert size={15} className="text-amberph" />
              )}
              <span className={cn("text-sm font-medium", qualified ? "text-emeraldph" : "text-amberph")}>
                {qualified ? "资质核验通过" : "资质核验未通过"}
              </span>
              <span className="ml-auto text-[11px] text-ink-300">该仪器需持证独立预约</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {requiredQuals.map((q) => (
                <Chip key={q.id} tone={qualified ? "phosphor" : "amber"}>
                  <FileText size={11} />
                  {q.name}
                </Chip>
              ))}
            </div>
            {!qualified && (
              <p className="mt-2 text-xs text-amberph/90">
                您尚未取得所需资质，预约仍可提交但需管理员审核；建议先在「资质管理」完成认证。
              </p>
            )}
          </div>
        )}

        {!instrument.requiresQualification && (
          <div className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/50 px-3 py-2.5 text-xs text-ink-200">
            <ShieldCheck size={14} className="text-emeraldph" />
            该仪器无需持证，提交后将自动确认并锁定时段。
          </div>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block tick-label">{label}</span>
      {children}
    </label>
  );
}
