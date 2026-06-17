import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader, EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, Chip } from "@/components/ui/Badge";
import { Avatar, GroupTag } from "@/components/ui/Avatar";
import { UsageLogModal } from "@/components/UsageLogModal";
import { healthMeta } from "@/lib/status";
import { formatDateTimeCN, parseISO } from "@/lib/date";
import { ClipboardList, ClipboardCheck, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation, InstrumentHealth } from "@/types";

export default function Logs() {
  const logs = useStore((s) => s.usageLogs);
  const reservations = useStore((s) => s.reservations);
  const instruments = useStore((s) => s.instruments);
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);

  const [query, setQuery] = useState("");
  const [insFilter, setInsFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState<InstrumentHealth | "all">("all");
  const [logTarget, setLogTarget] = useState<Reservation | null>(null);

  const pendingLogs = useMemo(
    () =>
      reservations
        .filter((r) => (r.status === "approved" || r.status === "in_progress") && parseISO(r.end).getTime() < Date.now())
        .filter((r) => !logs.some((l) => l.reservationId === r.id))
        .sort((a, b) => a.end.localeCompare(b.end)),
    [reservations, logs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs
      .filter((l) => insFilter === "all" || l.instrumentId === insFilter)
      .filter((l) => healthFilter === "all" || l.instrumentStatus === healthFilter)
      .filter((l) => {
        if (!q) return true;
        const ins = instruments.find((i) => i.id === l.instrumentId);
        const u = users.find((x) => x.id === l.userId);
        return [ins?.name, u?.name, l.anomaly, l.consumables].some((s) => s?.toLowerCase().includes(q));
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [logs, query, insFilter, healthFilter, instruments, users]);

  const stats = useMemo(() => {
    const normal = logs.filter((l) => l.instrumentStatus === "normal").length;
    const issues = logs.length - normal;
    return { total: logs.length, normal, issues };
  }, [logs]);

  return (
    <div>
      <PageHeader
        eyebrow="使用记录"
        title="仪器使用日志"
        description="使用完成后填写实际时长、仪器状态与异常情况，日志归档后计入统计。"
      />

      {/* pending logs */}
      {pendingLogs.length > 0 && (
        <div className="panel mb-6">
          <div className="flex items-center gap-2 border-b border-amberph/20 bg-amberph/5 px-5 py-3">
            <ClipboardCheck size={15} className="text-amberph" />
            <h2 className="text-sm font-medium text-amberph">待填写日志（{pendingLogs.length}）</h2>
            <span className="text-xs text-ink-300">· 使用结束但未归档的预约</span>
          </div>
          <div className="divide-y divide-ink-600/40">
            {pendingLogs.map((r) => {
              const ins = instruments.find((i) => i.id === r.instrumentId)!;
              const u = users.find((x) => x.id === r.userId)!;
              const group = groups.find((g) => g.id === r.groupId)!;
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={u.name} color={u.avatarColor} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-50">
                      <Link to={`/instruments/${ins.id}`} className="hover:text-phosphor-soft">{ins.name}</Link>
                      <span className="text-ink-300"> · {u.name}</span>
                      <GroupTag shortName={group.shortName} color={group.color} />
                    </p>
                    <p className="font-mono text-[10px] text-ink-300">{formatDateTimeCN(r.start)} · 预计 {r.durationHours}h</p>
                  </div>
                  <button onClick={() => setLogTarget(r)} className="btn-primary text-xs">
                    <ClipboardList size={13} /> 填写日志
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* summary */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <SummaryCard icon={ClipboardList} label="日志总数" value={stats.total} accent="#2DD4BF" />
        <SummaryCard icon={CheckCircle2} label="运行正常" value={stats.normal} accent="#34D399" />
        <SummaryCard icon={AlertTriangle} label="异常 / 故障" value={stats.issues} accent="#FB7185" />
      </div>

      {/* filters */}
      <div className="panel mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="input pl-9" placeholder="搜索仪器、人员、异常描述…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input w-auto" value={insFilter} onChange={(e) => setInsFilter(e.target.value)}>
          <option value="all">全部仪器</option>
          {instruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <div className="flex rounded-lg border border-ink-600 bg-ink-900/40 p-0.5">
          {[
            { v: "all", l: "全部" },
            { v: "normal", l: "正常" },
            { v: "minor_issue", l: "轻微" },
            { v: "fault", l: "故障" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setHealthFilter(o.v as InstrumentHealth | "all")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                healthFilter === o.v ? "bg-phosphor/15 text-phosphor-soft" : "text-ink-200 hover:text-ink-50",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* log list */}
      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState icon={ClipboardList} title="暂无使用日志" description="完成预约使用后，日志将归档于此。" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => {
            const ins = instruments.find((i) => i.id === l.instrumentId)!;
            const u = users.find((x) => x.id === l.userId)!;
            const group = groups.find((g) => g.id === l.groupId)!;
            const meta = healthMeta[l.instrumentStatus];
            const borderColor = l.instrumentStatus === "normal" ? "#34D399" : l.instrumentStatus === "minor_issue" ? "#F59E0B" : "#FB7185";
            return (
              <div key={l.id} className="panel panel-hover p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to={`/instruments/${ins.id}`} className="flex shrink-0 items-center gap-3 sm:w-64">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-900/60 ring-1 ring-inset ring-ink-500 font-mono text-[10px] text-phosphor-soft">
                      {ins.code.split("-")[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-50">{ins.name}</p>
                      <p className="font-mono text-[10px] text-ink-300">{ins.code}</p>
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1 border-l-2 pl-3" style={{ borderColor }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar name={u.name} color={u.avatarColor} size={20} />
                      <span className="text-xs text-ink-100">{u.name}</span>
                      <GroupTag shortName={group.shortName} color={group.color} />
                      <StatusBadge meta={meta} />
                      <Chip tone="default">实际 {l.actualDurationHours}h</Chip>
                    </div>
                    <p className="mt-1.5 text-xs text-ink-100">{l.anomaly}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-ink-300">
                      <span>耗材：{l.consumables}</span>
                      <span className="font-mono">{formatDateTimeCN(l.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {logTarget && (
        <UsageLogModal open={!!logTarget} onClose={() => setLogTarget(null)} reservation={logTarget} />
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: typeof ClipboardList; label: string; value: number; accent: string }) {
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
