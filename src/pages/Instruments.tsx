import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/ui/EmptyState";
import { Ring } from "@/components/ui/Ring";
import { StatusBadge, Chip } from "@/components/ui/Badge";
import { ReservationModal } from "@/components/ReservationModal";
import { Modal } from "@/components/ui/Modal";
import { instrumentStatusMeta } from "@/lib/status";
import { instrumentUtilization } from "@/lib/stats";
import { formatDateTimeCN, nowISO } from "@/lib/date";
import { roleLabels } from "@/store/useStore";
import {
  Microscope,
  Search,
  ShieldCheck,
  MapPin,
  FileText,
  CalendarPlus,
  Plus,
  Pencil,
  Ban,
  Settings2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReservationTarget } from "@/components/ReservationModal";
import type { InstrumentStatus, NewInstrumentInput, Role } from "@/types";

const statusFilters: { value: InstrumentStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "available", label: "空闲" },
  { value: "in_use", label: "使用中" },
  { value: "maintenance", label: "维护中" },
  { value: "offline", label: "已下线" },
];

const CATEGORY_OPTIONS = ["显微成像", "细胞分析", "分离分析", "光谱分析", "样品制备", "理化测试", "其他"];

type Editing = { mode: "create" } | { mode: "edit"; id: string };

function emptyForm(): NewInstrumentInput {
  return {
    name: "",
    model: "",
    code: "",
    category: "显微成像",
    location: "",
    manual: "",
    requirements: "",
    requiresQualification: false,
    qualificationIds: [],
    dailyOpenHour: 8,
    dailyCloseHour: 22,
    acquisitionDate: new Date().toISOString().slice(0, 10),
    utilizationTarget: 60,
  };
}

export default function Instruments() {
  const instruments = useStore((s) => s.instruments);
  const reservations = useStore((s) => s.reservations);
  const qualifications = useStore((s) => s.qualifications);
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);

  const createInstrument = useStore((s) => s.createInstrument);
  const updateInstrument = useStore((s) => s.updateInstrument);
  const offlineInstrument = useStore((s) => s.offlineInstrument);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InstrumentStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [target, setTarget] = useState<ReservationTarget | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState<NewInstrumentInput>(emptyForm());
  const [confirmOffline, setConfirmOffline] = useState<string | null>(null);

  const canManage: boolean = (["admin", "director"] as Role[]).includes(currentUser.role);

  const categories = useMemo(
    () => Array.from(new Set(instruments.map((i) => i.category))),
    [instruments],
  );

  const filtered = instruments.filter((i) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      i.name.toLowerCase().includes(q) ||
      i.model.toLowerCase().includes(q) ||
      i.code.toLowerCase().includes(q);
    const matchS = status === "all" || i.status === status;
    const matchC = category === "all" || i.category === category;
    return matchQ && matchS && matchC;
  });

  // hydrate form when opening edit
  useEffect(() => {
    if (!editing) return;
    if (editing.mode === "create") {
      setForm(emptyForm());
    } else {
      const ins = instruments.find((i) => i.id === editing.id);
      if (ins) {
        setForm({
          name: ins.name,
          model: ins.model,
          code: ins.code,
          category: ins.category,
          location: ins.location,
          manual: ins.manual,
          requirements: ins.requirements,
          requiresQualification: ins.requiresQualification,
          qualificationIds: [...ins.qualificationIds],
          dailyOpenHour: ins.dailyOpenHour,
          dailyCloseHour: ins.dailyCloseHour,
          acquisitionDate: ins.acquisitionDate,
          utilizationTarget: ins.utilizationTarget,
        });
      }
    }
  }, [editing, instruments]);

  const formValid =
    form.name.trim().length > 0 &&
    form.model.trim().length > 0 &&
    form.code.trim().length > 0 &&
    form.dailyOpenHour < form.dailyCloseHour &&
    form.dailyOpenHour >= 0 &&
    form.dailyCloseHour <= 24 &&
    form.utilizationTarget >= 10 &&
    form.utilizationTarget <= 100;

  const submitForm = () => {
    if (!editing || !formValid) return;
    if (editing.mode === "create") {
      createInstrument(form);
    } else {
      updateInstrument(editing.id, form);
    }
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="仪器资产"
        title="共用仪器列表"
        description="录入并管理实验室所有共用仪器，包含型号、手册、操作要求与持证预约设置。"
        actions={
          canManage && (
            <button onClick={() => setEditing({ mode: "create" })} className="btn-primary text-xs">
              <Plus size={14} />
              新增仪器
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="panel mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            className="input pl-9"
            placeholder="搜索仪器名称、型号或编号…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">全部分类</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex rounded-lg border border-ink-600 bg-ink-900/40 p-0.5 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  status === f.value ? "bg-phosphor/15 text-phosphor-soft" : "text-ink-200 hover:text-ink-50",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((ins) => {
          const util = instrumentUtilization(ins, reservations, 30);
          const meta = instrumentStatusMeta[ins.status];
          const next = reservations
            .filter(
              (r) =>
                r.instrumentId === ins.id &&
                r.start > nowISO() &&
                (r.status === "approved" || r.status === "pending" || r.status === "in_progress"),
            )
            .sort((a, b) => a.start.localeCompare(b.start))[0];
          return (
            <div key={ins.id} className="panel panel-hover group flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-900/60 ring-1 ring-inset ring-ink-500">
                    <Microscope size={18} className="text-phosphor-soft" />
                  </span>
                  <div>
                    <Link
                      to={`/instruments/${ins.id}`}
                      className="font-display text-sm font-semibold leading-tight text-ink-50 hover:text-phosphor-soft"
                    >
                      {ins.name}
                    </Link>
                    <p className="font-mono text-[10px] text-ink-300">{ins.model} · {ins.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge meta={meta} pulse={ins.status === "in_use"} />
                  {canManage && ins.status !== "offline" && (
                    <button
                      onClick={() => setEditing({ mode: "edit", id: ins.id })}
                      className="btn-subtle h-7 w-7 p-0 text-ink-200 hover:text-phosphor-soft"
                      title="编辑仪器信息"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Chip tone="default">{ins.category}</Chip>
                {ins.requiresQualification ? (
                  <Chip tone="amber"><ShieldCheck size={11} />需持证</Chip>
                ) : (
                  <Chip tone="phosphor"><ShieldCheck size={11} />免资质</Chip>
                )}
                <Chip tone="violet"><Clock size={11} />{ins.dailyOpenHour}-{ins.dailyCloseHour}时</Chip>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-ink-200">
                <p className="flex items-center gap-1.5"><MapPin size={12} className="text-ink-300" />{ins.location}</p>
                <p className="flex items-center gap-1.5"><FileText size={12} className="text-ink-300" />{ins.manual}</p>
                {ins.requiresQualification && ins.qualificationIds.length > 0 && (
                  <p className="flex items-start gap-1.5">
                    <Settings2 size={12} className="mt-0.5 shrink-0 text-ink-300" />
                    <span className="text-ink-200">
                      {ins.qualificationIds
                        .map((qid) => qualifications.find((q) => q.id === qid)?.abbr)
                        .filter(Boolean)
                        .join("、")}
                    </span>
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4 rounded-lg border border-ink-600 bg-ink-900/40 p-3">
                <Ring value={util.rate} size={52} stroke={5} label={`${Math.round(util.rate)}%`} />
                <div className="min-w-0 flex-1">
                  <p className="tick-label">近 30 日利用率</p>
                  <p className="mt-0.5 font-mono text-sm text-ink-50">
                    {util.usedHours}h <span className="text-ink-300">/ {util.capacityHours}h</span>
                  </p>
                  <p className="text-[10px] text-ink-300">目标 {util.target}%</p>
                </div>
              </div>

              {next && (
                <div className="mt-3 rounded-lg border border-skyph/20 bg-skyph/5 px-3 py-2 text-xs">
                  <p className="text-ink-300">下一预约</p>
                  <p className="mt-0.5 font-mono text-skyph">{formatDateTimeCN(next.start)}</p>
                  <p className="text-[10px] text-ink-300">
                    {users.find((u) => u.id === next.userId)?.name ?? "未知"} · {next.purpose.slice(0, 18)}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 pt-1">
                <Link to={`/instruments/${ins.id}`} className="btn-ghost flex-1 text-xs min-w-[96px]">
                  查看详情
                </Link>
                {canManage ? (
                  ins.status === "offline" ? (
                    <button
                      onClick={() => updateInstrument(ins.id, { status: "available" })}
                      className="btn-primary flex-1 text-xs min-w-[96px]"
                    >
                      恢复上线
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmOffline(ins.id)}
                      className="btn-danger flex-1 text-xs min-w-[96px]"
                    >
                      <Ban size={13} />
                      下线仪器
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setTarget({ instrumentId: ins.id })}
                    disabled={ins.status === "maintenance" || ins.status === "offline"}
                    className="btn-primary flex-1 text-xs min-w-[96px]"
                  >
                    <CalendarPlus size={13} />
                    立即预约
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="panel py-16 text-center text-sm text-ink-300">未找到匹配的仪器</div>
      )}

      {target && (
        <ReservationModal
          open={!!target}
          onClose={() => setTarget(null)}
          target={target}
        />
      )}

      {/* Create / Edit Modal */}
      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          size="lg"
          title={editing.mode === "create" ? "新增仪器" : "编辑仪器信息"}
          subtitle={`${editing.mode === "create" ? "录入新" : "修改"}共用仪器资产信息；保存后详情页和日历立即同步。当前角色：${roleLabels[currentUser.role]}`}
          footer={
            <>
              <button onClick={() => setEditing(null)} className="btn-ghost text-xs">取消</button>
              <button
                onClick={submitForm}
                disabled={!formValid}
                className="btn-primary text-xs"
              >
                {editing.mode === "create" ? "保存并录入" : "保存更改"}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="仪器名称" required>
              <input
                className="input"
                value={form.name}
                placeholder="例: 场发射扫描电子显微镜"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="型号" required>
              <input
                className="input"
                value={form.model}
                placeholder="例: Hitachi SU8100"
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </Field>
            <Field label="资产编号" required>
              <input
                className="input font-mono"
                value={form.code}
                placeholder="例: SEM-01"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </Field>
            <Field label="仪器分类">
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="放置位置" className="sm:col-span-2">
              <input
                className="input"
                value={form.location}
                placeholder="例: 实验楼 A · 305 室"
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
            <Field label="使用手册 / SOP" className="sm:col-span-2">
              <input
                className="input"
                value={form.manual}
                placeholder="文档名称或链接"
                onChange={(e) => setForm({ ...form, manual: e.target.value })}
              />
            </Field>
            <Field label="操作要求" className="sm:col-span-2">
              <textarea
                className="input min-h-[84px]"
                value={form.requirements}
                placeholder="例: 需提前 30min 预抽真空；样品需喷金处理；高分辨模式双人操作。"
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              />
            </Field>
            <Field label="购入日期">
              <input
                type="date"
                className="input"
                value={form.acquisitionDate}
                onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })}
              />
            </Field>
            <Field label="目标利用率 (%)">
              <input
                type="number"
                min={10}
                max={100}
                className="input"
                value={form.utilizationTarget}
                onChange={(e) => setForm({ ...form, utilizationTarget: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="每日开放时段 (小时)" className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="input w-28"
                  value={form.dailyOpenHour}
                  onChange={(e) => setForm({ ...form, dailyOpenHour: Number(e.target.value) || 0 })}
                />
                <span className="font-mono text-xs text-ink-300">至</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  className="input w-28"
                  value={form.dailyCloseHour}
                  onChange={(e) => setForm({ ...form, dailyCloseHour: Number(e.target.value) || 0 })}
                />
                <span className="font-mono text-[10px] text-ink-300">
                  {form.dailyOpenHour < form.dailyCloseHour
                    ? `每日开放 ${form.dailyCloseHour - form.dailyOpenHour} 小时`
                    : "⚠ 时段无效"}
                </span>
              </div>
            </Field>
            <Field label="独立预约需持证" className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.requiresQualification}
                  onChange={(e) => setForm({ ...form, requiresQualification: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-500 bg-ink-800 accent-phosphor"
                />
                <span className="text-xs text-ink-100">研究人员需持有已认证的相关资质，才可被批准独立使用该仪器</span>
              </label>
            </Field>
            {form.requiresQualification && (
              <Field label="关联资质项目" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {qualifications.map((q) => {
                    const checked = form.qualificationIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className={cn(
                          "chip cursor-pointer select-none ring-1 transition-all",
                          checked
                            ? "bg-violeph/15 text-violeph ring-violeph/40"
                            : "bg-ink-900/40 text-ink-200 ring-ink-500 hover:text-ink-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              qualificationIds: e.target.checked
                                ? [...form.qualificationIds, q.id]
                                : form.qualificationIds.filter((x) => x !== q.id),
                            });
                          }}
                        />
                        <span className="font-mono text-[10px]">{q.abbr}</span>
                        <span className="text-[11px]">{q.name}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>
            )}
          </div>
        </Modal>
      )}

      {/* Offline confirm */}
      {confirmOffline && (
        <Modal
          open
          onClose={() => setConfirmOffline(null)}
          size="sm"
          title="确认下线该仪器？"
          subtitle="下线后将屏蔽所有新预约提交；已预约但未使用的时段需由管理员另行处理。"
          footer={
            <>
              <button onClick={() => setConfirmOffline(null)} className="btn-ghost text-xs">取消</button>
              <button
                onClick={() => {
                  offlineInstrument(confirmOffline);
                  setConfirmOffline(null);
                }}
                className="btn-danger text-xs"
              >
                确认下线
              </button>
            </>
          }
        >
          {(() => {
            const ins = instruments.find((i) => i.id === confirmOffline);
            return ins ? (
              <div className="rounded-lg border border-ink-600 bg-ink-900/40 p-4 text-sm">
                <p className="font-medium text-ink-50">{ins.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-300">{ins.model} · {ins.code}</p>
              </div>
            ) : null;
          })()}
        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-medium text-ink-200">
        {label} {required && <span className="text-roseph">*</span>}
      </span>
      {children}
    </label>
  );
}
