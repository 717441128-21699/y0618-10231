import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader, EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Badge";
import { formatDateTimeCN, nowISO, parseISO, rangeLabel } from "@/lib/date";
import { Wrench, Plus, Trash2, CalendarClock, ShieldOff, Repeat, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceRecurrence } from "@/types";

const recurrenceLabels: Record<MaintenanceRecurrence, string> = {
  none: "单次",
  daily: "每日重复",
  weekly: "每周重复",
  monthly: "每月重复",
};

export default function Maintenance() {
  const maintenancePlans = useStore((s) => s.maintenancePlans);
  const instruments = useStore((s) => s.instruments);
  const addMaintenancePlan = useStore((s) => s.addMaintenancePlan);
  const removeMaintenancePlan = useStore((s) => s.removeMaintenancePlan);

  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...maintenancePlans].sort((a, b) => a.start.localeCompare(b.start)),
    [maintenancePlans],
  );

  const now = nowISO();
  const activeCount = maintenancePlans.filter((m) => m.start <= now && m.end >= now).length;

  return (
    <div>
      <PageHeader
        eyebrow="维护排程"
        title="仪器维护保养计划"
        description="录入维护窗口后，系统自动屏蔽对应时段的预约，避免冲突。"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> 新增维护计划
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={Wrench} label="维护计划总数" value={maintenancePlans.length} accent="#F59E0B" />
        <Stat icon={CalendarClock} label="进行中" value={activeCount} accent="#2DD4BF" />
        <Stat icon={Repeat} label="周期性维护" value={maintenancePlans.filter((m) => m.recurrence !== "none").length} accent="#A78BFA" />
        <Stat icon={ShieldOff} label="受屏蔽仪器" value={new Set(maintenancePlans.map((m) => m.instrumentId)).size} accent="#38BDF8" />
      </div>

      <div className="panel mb-6 flex items-start gap-3 border-l-2 border-l-amberph/60 p-4">
        <ShieldOff size={16} className="mt-0.5 shrink-0 text-amberph" />
        <div className="text-xs text-ink-200">
          <p className="font-medium text-amberph">维护屏蔽机制</p>
          <p className="mt-0.5">维护窗口生效期间，相关仪器的对应时段将在预约日历显示为不可预约；若与已存在预约冲突，需管理员协调改约。</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="panel">
          <EmptyState icon={Wrench} title="暂无维护计划" description="点击右上角新增维护计划，录入周期与窗口。" />
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => {
            const ins = instruments.find((i) => i.id === m.instrumentId)!;
            const isActive = m.start <= now && m.end >= now;
            const isUpcoming = m.start > now;
            return (
              <div key={m.id} className="panel panel-hover p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <Link to={`/instruments/${ins.id}`} className="flex shrink-0 items-center gap-3 lg:w-72">
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-lg ring-1 ring-inset",
                        isActive ? "bg-amberph/10 ring-amberph/30" : "bg-ink-900/60 ring-ink-500",
                      )}
                    >
                      <Wrench size={16} className={isActive ? "text-amberph" : "text-ink-200"} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-50">{ins.name}</p>
                      <p className="font-mono text-[10px] text-ink-300">{ins.code}</p>
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink-50">{m.title}</p>
                      <Chip tone={isActive ? "amber" : "default"}>{recurrenceLabels[m.recurrence]}</Chip>
                      {isActive && <Chip tone="amber">进行中</Chip>}
                      {isUpcoming && <Chip tone="sky">即将开始</Chip>}
                    </div>
                    <p className="mt-1 font-mono text-xs text-amberph">{formatDateTimeCN(m.start)} – {parseISO(m.end).getHours()}:{String(parseISO(m.end).getMinutes()).padStart(2, "0")}</p>
                    <p className="mt-1 text-xs text-ink-200">{m.note}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-ink-300">
                      <span className="flex items-center gap-1"><User size={10} /> {m.assignee}</span>
                      <span className="font-mono">{rangeLabel(m.start, m.end)}</span>
                    </div>
                  </div>

                  <button onClick={() => removeMaintenancePlan(m.id)} className="btn-subtle h-8 w-8 shrink-0 p-0 text-roseph hover:bg-roseph/10">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MaintenanceForm
        open={open}
        onClose={() => setOpen(false)}
        instruments={instruments}
        onSubmit={addMaintenancePlan}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Wrench; label: string; value: number; accent: string }) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-inset ring-ink-500" style={{ color: accent }}>
        <Icon size={16} />
      </span>
      <div>
        <p className="font-mono text-xl font-semibold text-ink-50">{value}</p>
        <p className="text-[10px] text-ink-300">{label}</p>
      </div>
    </div>
  );
}

function MaintenanceForm({
  open,
  onClose,
  instruments,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  instruments: ReturnType<typeof useStore.getState>["instruments"];
  onSubmit: (input: import("@/types").NewMaintenanceInput) => void;
}) {
  const [instrumentId, setInstrumentId] = useState(instruments[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(12);
  const [recurrence, setRecurrence] = useState<MaintenanceRecurrence>("none");
  const [assignee, setAssignee] = useState("林晓彤");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onSubmit({
      instrumentId,
      title: title.trim(),
      start: `${date}T${String(startHour).padStart(2, "0")}:00`,
      end: `${date}T${String(endHour).padStart(2, "0")}:00`,
      recurrence,
      assignee,
      note: note.trim() || "例行维护保养。",
    });
    setTitle("");
    setNote("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新增维护计划"
      subtitle="录入维护窗口后，对应时段将自动屏蔽预约"
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={!title.trim()} onClick={submit}>
            <Wrench size={15} /> 录入计划
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="目标仪器">
            <select className="input" value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
              {instruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="维护标题">
            <input className="input" placeholder="如：电子枪灯丝更换" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="维护日期">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="重复规则">
            <select className="input" value={recurrence} onChange={(e) => setRecurrence(e.target.value as MaintenanceRecurrence)}>
              <option value="none">单次</option>
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </Field>
          <Field label="开始时间">
            <select className="input" value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </Field>
          <Field label="结束时间">
            <select className="input" value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </Field>
        </div>
        <Field label="负责人">
          <input className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        </Field>
        <Field label="维护说明">
          <textarea className="input min-h-[72px] resize-none" placeholder="维护内容、注意事项…" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
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
