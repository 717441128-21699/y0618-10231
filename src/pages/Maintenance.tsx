import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader, EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Badge";
import { formatDateTimeCN, nowISO, parseISO, rangeLabel } from "@/lib/date";
import { Wrench, Plus, Trash2, CalendarClock, ShieldOff, Repeat, User, Pencil, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceRecurrence, MaintenancePlan, NewMaintenanceInput, UpdateMaintenanceInput } from "@/types";

const recurrenceLabels: Record<MaintenanceRecurrence, string> = {
  none: "单次",
  daily: "每日重复",
  weekly: "每周重复",
  monthly: "每月重复",
};

const recurrenceOptions: { value: MaintenanceRecurrence; label: string }[] = [
  { value: "none", label: "单次" },
  { value: "daily", label: "每日" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
];

export default function Maintenance() {
  const maintenancePlans = useStore((s) => s.maintenancePlans);
  const instruments = useStore((s) => s.instruments);
  const addMaintenancePlan = useStore((s) => s.addMaintenancePlan);
  const updateMaintenancePlan = useStore((s) => s.updateMaintenancePlan);
  const removeMaintenancePlan = useStore((s) => s.removeMaintenancePlan);
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId));

  const canManage = currentUser ? ["admin", "director"].includes(currentUser.role) : false;

  const [editing, setEditing] = useState<{ mode: "create" | "edit"; id?: string } | null>(null);

  const sorted = useMemo(
    () => [...maintenancePlans].sort((a, b) => a.start.localeCompare(b.start)),
    [maintenancePlans],
  );

  const now = nowISO();
  const activeCount = maintenancePlans.filter((m) => m.start <= now && m.end >= now).length;

  const editingPlan = editing?.id ? maintenancePlans.find((p) => p.id === editing.id) : null;

  return (
    <div>
      <PageHeader
        eyebrow="维护排程"
        title="仪器维护保养计划"
        description="录入维护窗口后，系统自动屏蔽对应时段的预约，避免冲突。"
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => setEditing({ mode: "create" })}>
              <Plus size={15} /> 新增维护计划
            </button>
          )
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
                    <p className="mt-1 font-mono text-xs text-amberph">
                      {formatDateTimeCN(m.start)} – {formatTimeOnly(m.end)}
                    </p>
                    <p className="mt-1 text-xs text-ink-200 line-clamp-1">{m.note}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-ink-300">
                      <span className="flex items-center gap-1"><User size={10} /> {m.assignee}</span>
                      <span className="font-mono">{rangeLabel(m.start, m.end)}</span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing({ mode: "edit", id: m.id })}
                        className="btn-subtle h-8 w-8 shrink-0 p-0 text-ink-200 hover:bg-phosphor/10 hover:text-phosphor-soft"
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeMaintenancePlan(m.id)}
                        className="btn-subtle h-8 w-8 shrink-0 p-0 text-roseph hover:bg-roseph/10"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MaintenanceForm
        open={!!editing}
        mode={editing?.mode ?? "create"}
        plan={editingPlan ?? undefined}
        instruments={instruments}
        onClose={() => setEditing(null)}
        onSubmitCreate={(input) => addMaintenancePlan(input)}
        onSubmitUpdate={(id, patch) => updateMaintenancePlan(id, patch)}
      />
    </div>
  );
}

function formatTimeOnly(iso: string): string {
  const d = parseISO(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  mode,
  plan,
  instruments,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: {
  open: boolean;
  mode: "create" | "edit";
  plan?: MaintenancePlan;
  instruments: ReturnType<typeof useStore.getState>["instruments"];
  onClose: () => void;
  onSubmitCreate: (input: NewMaintenanceInput) => string;
  onSubmitUpdate: (id: string, patch: UpdateMaintenanceInput) => void;
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
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && plan) {
      setInstrumentId(plan.instrumentId);
      setTitle(plan.title);
      const sd = parseISO(plan.start);
      setDate(sd.toISOString().slice(0, 10));
      setStartHour(sd.getHours());
      const ed = parseISO(plan.end);
      setEndHour(ed.getHours());
      setRecurrence(plan.recurrence);
      setAssignee(plan.assignee);
      setNote(plan.note);
    } else {
      setInstrumentId(instruments[0]?.id ?? "");
      setTitle("");
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setDate(d.toISOString().slice(0, 10));
      setStartHour(9);
      setEndHour(12);
      setRecurrence("none");
      setAssignee("");
      setNote("");
    }
  }, [open, mode, plan, instruments]);

  const errors = useMemo(() => {
    const list: string[] = [];
    if (!title.trim()) list.push("请填写维护标题");
    if (!instrumentId) list.push("请选择目标仪器");
    if (!assignee.trim()) list.push("请指定负责人");
    if (endHour <= startHour) list.push("结束时间必须晚于开始时间");
    const dur = endHour - startHour;
    if (dur > 0 && dur < 0.5) list.push("维护窗口至少需要 30 分钟");
    if (dur > 24) list.push("单次维护不能超过 24 小时");
    return list;
  }, [title, instrumentId, assignee, startHour, endHour]);

  const submit = () => {
    if (errors.length > 0) return;
    const startISO = `${date}T${String(startHour).padStart(2, "0")}:00`;
    const endISO = `${date}T${String(endHour).padStart(2, "0")}:00`;
    if (mode === "edit" && plan) {
      const patch: UpdateMaintenanceInput = {
        instrumentId,
        title: title.trim(),
        start: startISO,
        end: endISO,
        recurrence,
        assignee: assignee.trim(),
        note: note.trim() || "例行维护保养。",
      };
      onSubmitUpdate(plan.id, patch);
    } else {
      onSubmitCreate({
        instrumentId,
        title: title.trim(),
        start: startISO,
        end: endISO,
        recurrence,
        assignee: assignee.trim(),
        note: note.trim() || "例行维护保养。",
      });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "编辑维护计划" : "新增维护计划"}
      subtitle={mode === "edit" ? "修改后对应时段将自动更新预约屏蔽规则" : "录入维护窗口后，对应时段将自动屏蔽预约"}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={errors.length > 0} onClick={submit}>
            <Wrench size={15} /> {mode === "edit" ? "保存修改" : "录入计划"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-roseph/10 p-3 ring-1 ring-inset ring-roseph/30">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-roseph" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-roseph">无法保存，请先处理以下问题</p>
              <ul className="list-inside list-disc text-[11px] text-roseph/80">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="目标仪器">
            <select className="input" value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
              {instruments.filter((i) => i.status !== "offline").map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
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
              {recurrenceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
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
          <input className="input" placeholder="维护执行人姓名" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
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
