import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader, SectionLabel } from "@/components/ui/EmptyState";
import { Bar } from "@/components/ui/Ring";
import { Chip, StatusBadge } from "@/components/ui/Badge";
import {
  instrumentUtilization,
  groupUsageShare,
  peakHourDistribution,
  procurementSuggestions,
} from "@/lib/stats";
import { priorityMeta } from "@/lib/status";
import { BarChart3, TrendingUp, Users, Clock, ShoppingCart, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WINDOWS = [
  { days: 7, label: "近 7 日" },
  { days: 30, label: "近 30 日" },
  { days: 90, label: "近 90 日" },
];

export default function Analytics() {
  const instruments = useStore((s) => s.instruments);
  const reservations = useStore((s) => s.reservations);
  const logs = useStore((s) => s.usageLogs);
  const groups = useStore((s) => s.groups);

  const [days, setDays] = useState(30);

  const utilization = useMemo(
    () =>
      instruments
        .map((i) => ({ ins: i, util: instrumentUtilization(i, reservations, days) }))
        .sort((a, b) => b.util.rate - a.util.rate),
    [instruments, reservations, days],
  );

  const groupShare = useMemo(
    () => groupUsageShare(groups, logs, reservations, days),
    [groups, logs, reservations, days],
  );

  const peak = useMemo(
    () => peakHourDistribution(reservations, days),
    [reservations, days],
  );
  const peakMax = Math.max(...peak.map((p) => p.hours), 1);

  const procurement = useMemo(
    () => procurementSuggestions(instruments, reservations, days),
    [instruments, reservations, days],
  );

  const totalHours = utilization.reduce((s, u) => s + u.util.usedHours, 0);
  const avgUtilization = utilization.length
    ? utilization.reduce((s, u) => s + u.util.rate, 0) / utilization.length
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow="数据分析"
        title="使用率与采购决策看板"
        description="统计各仪器利用率、课题组使用时长占比与高峰时段，辅助新仪器采购决策。"
        actions={
          <div className="flex rounded-lg border border-ink-600 bg-ink-900/40 p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                onClick={() => setDays(w.days)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  days === w.days ? "bg-phosphor/15 text-phosphor-soft" : "text-ink-200 hover:text-ink-50",
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={BarChart3} label="平均利用率" value={`${avgUtilization.toFixed(0)}%`} accent="#2DD4BF" />
        <Kpi icon={Clock} label="累计使用时长" value={`${totalHours.toFixed(1)}h`} accent="#A78BFA" />
        <Kpi icon={Users} label="活跃课题组" value={`${groupShare.filter((g) => g.hours > 0).length}/${groups.length}`} accent="#38BDF8" />
        <Kpi icon={TrendingUp} label="超载仪器数" value={`${procurement.filter((p) => p.overload > 0).length}`} accent="#FB7185" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Utilization ranking */}
        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-600/80 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-ink-50">仪器利用率排行</h2>
              <p className="text-xs text-ink-300">实线为实际利用率，虚标线为目标利用率</p>
            </div>
            <Chip tone="phosphor">{days} 日窗口</Chip>
          </div>
          <div className="space-y-3.5 p-5">
            {utilization.map(({ ins, util }) => (
              <div key={ins.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <Link to={`/instruments/${ins.id}`} className="flex min-w-0 items-center gap-2 hover:text-phosphor-soft">
                    <span className="font-mono text-[10px] text-ink-300">{ins.code.split("-")[0]}</span>
                    <span className="truncate text-xs text-ink-50">{ins.name}</span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                    <span className="text-ink-300">{util.usedHours}h</span>
                    <span className="text-phosphor-soft">{util.rate.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="relative">
                  <Bar value={util.rate} max={100} color={util.rate >= util.target ? "#2DD4BF" : "#F59E0B"} />
                  <div
                    className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-ink-50/40"
                    style={{ left: `${util.target}%` }}
                    title={`目标 ${util.target}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group share donut */}
        <div className="panel">
          <div className="border-b border-ink-600/80 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink-50">课题组使用占比</h2>
            <p className="text-xs text-ink-300">按实际使用时长统计</p>
          </div>
          <div className="flex flex-col items-center p-5">
            <Donut
              segments={groupShare.map((g) => ({ value: g.hours, color: g.group.color, label: g.group.shortName }))}
              center={`${groupShare.reduce((s, g) => s + g.hours, 0).toFixed(0)}h`}
              centerLabel="总时长"
            />
            <div className="mt-5 w-full space-y-2">
              {groupShare.map((g) => (
                <div key={g.group.id} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: g.group.color }} />
                  <span className="flex-1 truncate text-xs text-ink-100">{g.group.name}</span>
                  <span className="font-mono text-xs text-ink-300">{g.hours}h</span>
                  <span className="w-10 text-right font-mono text-xs text-phosphor-soft">{g.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Peak hours */}
        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-600/80 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-ink-50">高峰使用时段分布</h2>
              <p className="text-xs text-ink-300">按起始小时累计使用时长（小时）</p>
            </div>
            <Chip tone="amber">{peakMax.toFixed(1)}h 峰值</Chip>
          </div>
          <div className="p-5">
            <div className="flex h-44 items-end gap-1">
              {peak.map((p) => (
                <div key={p.hour} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${p.hour}:00 · ${p.hours}h`}>
                  <span className="font-mono text-[9px] text-ink-300 opacity-0 transition-opacity group-hover:opacity-100">{p.hours}h</span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(p.hours / peakMax) * 100}%`,
                      minHeight: p.hours > 0 ? 4 : 0,
                      background: `linear-gradient(180deg, ${p.hours >= peakMax * 0.6 ? "#F59E0B" : "#2DD4BF"}, ${p.hours >= peakMax * 0.6 ? "#F59E0B55" : "#2DD4BF55"})`,
                      boxShadow: p.hours >= peakMax * 0.6 ? "0 0 10px rgba(245,158,11,0.3)" : "none",
                      transition: "height 0.6s cubic-bezier(0.2,0.7,0.2,1)",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t border-ink-600/40 pt-1.5">
              {peak.filter((_, i) => i % 2 === 0).map((p) => (
                <span key={p.hour} className="font-mono text-[9px] text-ink-300">{String(p.hour).padStart(2, "0")}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Procurement decision */}
        <div className="panel">
          <div className="flex items-center gap-2 border-b border-ink-600/80 px-5 py-4">
            <ShoppingCart size={15} className="text-phosphor-soft" />
            <div>
              <h2 className="font-display text-base font-semibold text-ink-50">采购决策辅助</h2>
              <p className="text-xs text-ink-300">高负载仪器识别</p>
            </div>
          </div>
          <div className="divide-y divide-ink-600/40">
            {procurement.slice(0, 5).map((p) => (
              <div key={p.instrument.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/instruments/${p.instrument.id}`} className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-50">{p.instrument.name}</p>
                    <p className="font-mono text-[10px] text-ink-300">{p.instrument.code}</p>
                  </Link>
                  <StatusBadge meta={priorityMeta[p.priority]} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Bar value={p.rate} color={p.priority === "high" ? "#FB7185" : p.priority === "medium" ? "#F59E0B" : "#34D399"} />
                  <span className="w-12 shrink-0 text-right font-mono text-[10px] text-ink-200">+{p.overload}%</span>
                </div>
                {p.priority === "high" && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-roseph">
                    <ArrowUpRight size={11} /> 建议优先采购同类仪器以缓解负载
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 panel border-l-2 border-l-phosphor/50 p-5">
        <SectionLabel>洞察小结</SectionLabel>
        <div className="grid grid-cols-1 gap-3 text-sm text-ink-100 sm:grid-cols-2">
          <Insight
            text={`利用率最高的是「${utilization[0]?.ins.name ?? "—"}」，达 ${utilization[0]?.util.rate.toFixed(0) ?? 0}%，${utilization[0] && utilization[0].util.rate >= utilization[0].util.target ? "已超目标负载。" : "接近目标。"}`}
          />
          <Insight
            text={`「${groupShare[0]?.group.shortName ?? "—"}」课题组使用占比最高，约 ${groupShare[0]?.share ?? 0}%，可关注其排期公平性。`}
          />
          <Insight
            text={`高峰时段集中在 ${peakHoursLabel(peak)}，建议错峰引导与延长开放。`}
          />
          <Insight
            text={procurement[0]?.overload > 0 ? `「${procurement[0].instrument.name}」持续超载 ${procurement[0].overload}%，建议纳入下一轮采购计划。` : "当前各仪器负载均衡，暂无迫切采购需求。"}
          />
        </div>
      </div>
    </div>
  );
}

function peakHoursLabel(peak: { hour: number; hours: number }[]): string {
  const max = Math.max(...peak.map((p) => p.hours));
  const top = peak.filter((p) => p.hours >= max * 0.6).map((p) => `${String(p.hour).padStart(2, "0")}:00`);
  return top.join("、") || "全天均匀";
}

function Insight({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2.5">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-phosphor shadow-[0_0_6px_#2DD4BF]" />
      <span className="text-xs leading-relaxed text-ink-100">{text}</span>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: typeof BarChart3; label: string; value: string; accent: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="tick-label">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset ring-ink-500" style={{ color: accent }}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold text-ink-50 glow-text">{value}</p>
    </div>
  );
}

function Donut({
  segments,
  center,
  centerLabel,
  size = 160,
}: {
  segments: { value: number; color: string; label: string }[];
  center: string;
  centerLabel: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1A212B" strokeWidth={18} />
        {total > 0 &&
          segments.map((seg, i) => {
            const frac = seg.value / total;
            const len = frac * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={18}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                style={{ transition: "stroke-dasharray 0.7s ease, stroke-dashoffset 0.7s ease" }}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold text-ink-50">{center}</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-300">{centerLabel}</span>
      </div>
    </div>
  );
}
