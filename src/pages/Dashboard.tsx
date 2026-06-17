import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader, SectionLabel } from "@/components/ui/EmptyState";
import { Sparkline } from "@/components/ui/Sparkline";
import { Ring } from "@/components/ui/Ring";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar, GroupTag } from "@/components/ui/Avatar";
import { reservationStatusMeta, instrumentStatusMeta } from "@/lib/status";
import { instrumentUtilization } from "@/lib/stats";
import {
  formatTime,
  rangeLabel,
  parseISO,
  addDays,
  dayKey,
  formatDateTimeCN,
  nowISO,
} from "@/lib/date";
import {
  Activity,
  CalendarClock,
  ShieldCheck,
  Timer,
  ArrowRight,
  Wrench,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const instruments = useStore((s) => s.instruments);
  const reservations = useStore((s) => s.reservations);
  const logs = useStore((s) => s.usageLogs);
  const maintenancePlans = useStore((s) => s.maintenancePlans);
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);

  const todayKey = dayKey(new Date());

  const todays = useMemo(
    () =>
      reservations
        .filter((r) => dayKey(r.start) === todayKey && r.status !== "cancelled" && r.status !== "rejected")
        .sort((a, b) => a.start.localeCompare(b.start)),
    [reservations, todayKey],
  );

  const pending = reservations.filter((r) => r.status === "pending");
  const awaitingLog = reservations.filter(
    (r) => (r.status === "approved" || r.status === "in_progress") && parseISO(r.end).getTime() < Date.now(),
  );

  const monthHours = useMemo(() => {
    const from = addDays(new Date(), -30).getTime();
    return logs.filter((l) => parseISO(l.createdAt).getTime() >= from).reduce((s, l) => s + l.actualDurationHours, 0);
  }, [logs]);

  const availableCount = instruments.filter((i) => i.status !== "maintenance" && i.status !== "offline").length;

  // 7-day usage sparkline
  const spark = useMemo(() => {
    const arr: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayKey(addDays(new Date(), -i));
      const hrs = reservations
        .filter((r) => dayKey(r.start) === d && r.status !== "cancelled" && r.status !== "rejected")
        .reduce((s, r) => s + r.durationHours, 0);
      arr.push(hrs);
    }
    return arr;
  }, [reservations]);

  const upcomingMaintenance = useMemo(() => {
    const now = nowISO();
    return maintenancePlans
      .filter((m) => m.start >= now)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 3);
  }, [maintenancePlans]);

  const topInstruments = useMemo(
    () =>
      instruments
        .map((i) => ({ ins: i, util: instrumentUtilization(i, reservations, 30) }))
        .sort((a, b) => b.util.rate - a.util.rate)
        .slice(0, 4),
    [instruments, reservations],
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "上午好";
    if (h < 18) return "下午好";
    return "晚上好";
  })();

  return (
    <div>
      <PageHeader
        eyebrow={`${greeting}，${currentUser.name}`}
        title="实验室预约控制台"
        description={`今天是 ${formatDateTimeCN(new Date())} · 共享仪器时段一目了然，资质、维护与使用率尽在掌握。`}
        actions={
          <Link to="/calendar" className="btn-primary">
            <CalendarClock size={15} />
            预约日历
          </Link>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Activity}
          label="可用仪器"
          value={`${availableCount}`}
          unit={`/ ${instruments.length} 台`}
          accent="#34D399"
          trend={spark}
          trendLabel="近 7 日使用"
        />
        <MetricCard
          icon={CalendarClock}
          label="今日预约"
          value={`${todays.length}`}
          unit="场次"
          accent="#2DD4BF"
          trend={spark}
          trendLabel="近 7 日场次"
        />
        <MetricCard
          icon={ShieldCheck}
          label="待审核"
          value={`${pending.length}`}
          unit="条申请"
          accent="#F59E0B"
          trend={[2, 3, 1, 4, 2, pending.length, pending.length]}
          trendLabel="待审趋势"
          link="/reviews"
        />
        <MetricCard
          icon={Timer}
          label="近 30 日使用"
          value={monthHours.toFixed(1)}
          unit="小时"
          accent="#A78BFA"
          trend={spark}
          trendLabel="使用时长"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today timeline */}
        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-600/80 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-ink-50">今日预约时间线</h2>
              <p className="text-xs text-ink-300">按仪器展示当日各时段占用情况</p>
            </div>
            <Link to="/calendar" className="btn-subtle text-xs">
              全部日历 <ArrowRight size={13} />
            </Link>
          </div>
          <div className="p-5">
            <TodayTimeline reservations={todays} instruments={instruments} />
          </div>
        </div>

        {/* Todo reminders */}
        <div className="panel">
          <div className="border-b border-ink-600/80 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink-50">待办提醒</h2>
            <p className="text-xs text-ink-300">需要你关注的事项</p>
          </div>
          <div className="divide-y divide-ink-600/60">
            <TodoRow
              icon={ShieldCheck}
              tone="amber"
              title={`${pending.length} 条预约待审核`}
              desc="含资质核验，请尽快处理"
              to="/reviews"
              count={pending.length}
            />
            <TodoRow
              icon={ClipboardList}
              tone="phosphor"
              title={`${awaitingLog.length} 条使用日志待填写`}
              desc="使用完成后请及时归档日志"
              to="/logs"
              count={awaitingLog.length}
            />
            <TodoRow
              icon={Wrench}
              tone="violet"
              title={`${upcomingMaintenance.length} 项维护即将开始`}
              desc="维护期间对应时段已自动屏蔽"
              to="/maintenance"
              count={upcomingMaintenance.length}
            />
          </div>
        </div>
      </div>

      {/* Utilization overview + upcoming maintenance list */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-600/80 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-ink-50">仪器使用率概览</h2>
              <p className="text-xs text-ink-300">近 30 日利用率排行（环值＝利用率 / 目标）</p>
            </div>
            <Link to="/analytics" className="btn-subtle text-xs">
              统计分析 <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {topInstruments.map(({ ins, util }) => (
              <Link
                key={ins.id}
                to={`/instruments/${ins.id}`}
                className="panel-hover group rounded-xl border border-ink-600 bg-ink-900/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <Ring value={util.rate} size={48} stroke={5} label={`${Math.round(util.rate)}%`} />
                  <ChevronRight size={15} className="text-ink-300 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-3 truncate text-sm font-medium text-ink-50">{ins.name}</p>
                <p className="font-mono text-[10px] text-ink-300">{ins.code} · 目标 {util.target}%</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="border-b border-ink-600/80 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink-50">即将到来的维护</h2>
            <p className="text-xs text-ink-300">维护窗口自动屏蔽预约</p>
          </div>
          <div className="divide-y divide-ink-600/60">
            {upcomingMaintenance.map((m) => {
              const ins = instruments.find((i) => i.id === m.instrumentId)!;
              return (
                <div key={m.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-50">{m.title}</p>
                      <p className="truncate text-xs text-ink-300">{ins.name}</p>
                    </div>
                    <StatusBadge meta={instrumentStatusMeta.maintenance} />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-amberph">
                    <Wrench size={11} />
                    {formatDateTimeCN(m.start)} 起
                  </div>
                </div>
              );
            })}
            {upcomingMaintenance.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-ink-300">近期无维护计划</p>
            )}
          </div>
        </div>
      </div>

      {/* Today's reservation list */}
      <div className="mt-6 panel">
        <SectionLabel right={<span className="font-mono text-xs text-ink-300">{todays.length} 场</span>}>
          <div className="px-5 pt-4">今日预约明细</div>
        </SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-ink-600/60 text-left tick-label">
                <th className="px-5 py-2.5 font-medium">时段</th>
                <th className="px-5 py-2.5 font-medium">仪器</th>
                <th className="px-5 py-2.5 font-medium">申请人</th>
                <th className="px-5 py-2.5 font-medium">实验用途</th>
                <th className="px-5 py-2.5 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600/40">
              {todays.map((r) => {
                const ins = instruments.find((i) => i.id === r.instrumentId)!;
                const u = users.find((x) => x.id === r.userId)!;
                const group = groups.find((g) => g.id === r.groupId)!;
                const meta = reservationStatusMeta[r.status];
                return (
                  <tr key={r.id} className="transition-colors hover:bg-ink-700/30">
                    <td className="px-5 py-3 font-mono text-xs text-phosphor-soft">{rangeLabel(r.start, r.end)}</td>
                    <td className="px-5 py-3">
                      <Link to={`/instruments/${ins.id}`} className="font-medium text-ink-50 hover:text-phosphor-soft">
                        {ins.name}
                      </Link>
                      <p className="font-mono text-[10px] text-ink-300">{ins.code}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={u.name} color={u.avatarColor} size={22} />
                        <span className="text-xs text-ink-100">{u.name}</span>
                        <GroupTag shortName={group.shortName} color={group.color} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-100">{r.purpose}</td>
                    <td className="px-5 py-3">
                      <StatusBadge meta={meta} pulse={r.status === "in_progress"} />
                    </td>
                  </tr>
                );
              })}
              {todays.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-300">今日暂无预约</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  accent,
  trend,
  trendLabel,
  link,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  accent: string;
  trend: number[];
  trendLabel: string;
  link?: string;
}) {
  const content = (
    <div className="panel panel-hover group relative overflow-hidden p-5">
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center justify-between">
        <span className="tick-label">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset ring-ink-500" style={{ color: accent }}>
          <Icon size={15} />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-mono text-3xl font-semibold tracking-tight text-ink-50 glow-text">{value}</span>
        <span className="mb-1 text-xs text-ink-300">{unit}</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-ink-300">{trendLabel}</span>
        <Sparkline data={trend} width={90} height={26} color={accent} />
      </div>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8..22

function TodayTimeline({
  reservations,
  instruments,
}: {
  reservations: ReturnType<typeof useStore.getState>["reservations"];
  instruments: ReturnType<typeof useStore.getState>["instruments"];
}) {
  const rows = instruments.filter((i) =>
    reservations.some((r) => r.instrumentId === i.id),
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* hour ruler */}
        <div className="mb-2 flex items-center">
          <div className="w-28 shrink-0" />
          <div className="relative flex-1">
            <div className="flex justify-between">
              {HOURS.map((h) => (
                <span key={h} className="font-mono text-[9px] text-ink-300">
                  {String(h).padStart(2, "0")}
                </span>
              ))}
            </div>
            <div className="mt-1 h-px divider-tick" />
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((ins) => {
            const items = reservations.filter((r) => r.instrumentId === ins.id);
            return (
              <div key={ins.id} className="flex items-center">
                <Link to={`/instruments/${ins.id}`} className="w-28 shrink-0 truncate pr-2 text-xs text-ink-100 hover:text-phosphor-soft">
                  {ins.name}
                </Link>
                <div className="relative h-9 flex-1 rounded-md bg-ink-900/50 ring-1 ring-inset ring-ink-600/60">
                  {HOURS.map((h, i) => (
                    <span
                      key={h}
                      className="absolute top-0 h-full border-l border-ink-600/40"
                      style={{ left: `${(i / (HOURS.length - 1)) * 100}%` }}
                    />
                  ))}
                  {items.map((r) => {
                    const startH = parseISO(r.start).getHours() + parseISO(r.start).getMinutes() / 60;
                    const endH = parseISO(r.end).getHours() + parseISO(r.end).getMinutes() / 60;
                    const left = ((startH - 8) / 14) * 100;
                    const width = ((endH - startH) / 14) * 100;
                    const meta = reservationStatusMeta[r.status];
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "absolute top-1 bottom-1 flex items-center overflow-hidden rounded px-2 text-[10px] font-medium ring-1 ring-inset",
                          meta.bg,
                          meta.text,
                          meta.ring,
                        )}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${formatTime(r.start)}–${formatTime(r.end)} · ${r.purpose}`}
                      >
                        <span className="truncate">{formatTime(r.start)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-300">今日暂无预约安排</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TodoRow({
  icon: Icon,
  tone,
  title,
  desc,
  to,
  count,
}: {
  icon: LucideIcon;
  tone: "amber" | "phosphor" | "violet";
  title: string;
  desc: string;
  to: string;
  count: number;
}) {
  const tones: Record<string, string> = {
    amber: "bg-amberph/10 text-amberph ring-amberph/30",
    phosphor: "bg-phosphor/10 text-phosphor-soft ring-phosphor/30",
    violet: "bg-violeph/10 text-violeph ring-violeph/30",
  };
  return (
    <Link to={to} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-700/30">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset", tones[tone])}>
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-50">{title}</p>
        <p className="truncate text-xs text-ink-300">{desc}</p>
      </div>
      {count > 0 && (
        <span className="font-mono text-lg font-semibold text-ink-50">{count}</span>
      )}
      <ChevronRight size={15} className="text-ink-300" />
    </Link>
  );
}
