import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/ui/EmptyState";
import { Ring } from "@/components/ui/Ring";
import { StatusBadge, Chip } from "@/components/ui/Badge";
import { ReservationModal } from "@/components/ReservationModal";
import { instrumentStatusMeta } from "@/lib/status";
import { instrumentUtilization } from "@/lib/stats";
import { formatDateTimeCN, nowISO } from "@/lib/date";
import { Microscope, Search, ShieldCheck, MapPin, FileText, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReservationTarget } from "@/components/ReservationModal";
import type { InstrumentStatus } from "@/types";

const statusFilters: { value: InstrumentStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "available", label: "空闲" },
  { value: "in_use", label: "使用中" },
  { value: "maintenance", label: "维护中" },
];

export default function Instruments() {
  const instruments = useStore((s) => s.instruments);
  const reservations = useStore((s) => s.reservations);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InstrumentStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [target, setTarget] = useState<ReservationTarget | null>(null);

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

  return (
    <div>
      <PageHeader
        eyebrow="仪器资产"
        title="共用仪器列表"
        description="录入并管理实验室所有共用仪器，包含型号、手册、操作要求与持证预约设置。"
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
          <div className="flex rounded-lg border border-ink-600 bg-ink-900/40 p-0.5">
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
                <StatusBadge meta={meta} pulse={ins.status === "in_use"} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Chip tone="default">{ins.category}</Chip>
                {ins.requiresQualification ? (
                  <Chip tone="amber"><ShieldCheck size={11} />需持证</Chip>
                ) : (
                  <Chip tone="phosphor"><ShieldCheck size={11} />免资质</Chip>
                )}
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-ink-200">
                <p className="flex items-center gap-1.5"><MapPin size={12} className="text-ink-300" />{ins.location}</p>
                <p className="flex items-center gap-1.5"><FileText size={12} className="text-ink-300" />{ins.manual}</p>
                <p className="flex items-center gap-1.5 font-mono text-ink-300">
                  开放时段 {String(ins.dailyOpenHour).padStart(2, "0")}:00–{String(ins.dailyCloseHour).padStart(2, "0")}:00
                </p>
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
                </div>
              )}

              <div className="mt-4 flex gap-2 pt-1">
                <Link to={`/instruments/${ins.id}`} className="btn-ghost flex-1 text-xs">
                  查看详情
                </Link>
                <button
                  onClick={() => setTarget({ instrumentId: ins.id })}
                  disabled={ins.status === "maintenance"}
                  className="btn-primary flex-1 text-xs"
                >
                  <CalendarPlus size={13} />
                  立即预约
                </button>
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
    </div>
  );
}
