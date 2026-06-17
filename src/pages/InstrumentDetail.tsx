import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/ui/EmptyState";
import { Ring, Bar } from "@/components/ui/Ring";
import { StatusBadge, Chip } from "@/components/ui/Badge";
import { ReservationModal } from "@/components/ReservationModal";
import { instrumentStatusMeta, reservationStatusMeta } from "@/lib/status";
import { instrumentUtilization } from "@/lib/stats";
import {
  addDays,
  dayKey,
  formatDateShort,
  formatTime,
  parseISO,
  startOfWeek,
  weekdayCN,
  formatDateTimeCN,
  isBefore,
  overlaps,
  nowISO,
} from "@/lib/date";
import {
  ArrowLeft,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  ShieldCheck,
  Wrench,
  Cpu,
  BookOpen,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReservationTarget } from "@/components/ReservationModal";

const HOUR_HEIGHT = 46;

export default function InstrumentDetail() {
  const { id } = useParams();
  const instruments = useStore((s) => s.instruments);
  const reservations = useStore((s) => s.reservations);
  const maintenancePlans = useStore((s) => s.maintenancePlans);
  const qualifications = useStore((s) => s.qualifications);
  const groups = useStore((s) => s.groups);
  const users = useStore((s) => s.users);
  const logs = useStore((s) => s.usageLogs);

  const ins = instruments.find((i) => i.id === id);
  const [weekOffset, setWeekOffset] = useState(0);
  const [target, setTarget] = useState<ReservationTarget | null>(null);

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  if (!ins) {
    return (
      <div className="panel py-20 text-center">
        <p className="text-ink-200">未找到该仪器</p>
        <Link to="/instruments" className="btn-primary mt-4">返回列表</Link>
      </div>
    );
  }

  const util = instrumentUtilization(ins, reservations, 30);
  const meta = instrumentStatusMeta[ins.status];
  const requiredQuals = qualifications.filter((q) => ins.qualificationIds.includes(q.id));

  const insReservations = reservations.filter((r) => r.instrumentId === ins.id);
  const insLogs = logs.filter((l) => l.instrumentId === ins.id).slice(0, 5);
  const insMaintenance = maintenancePlans.filter((m) => m.instrumentId === ins.id);

  const openHour = ins.dailyOpenHour;
  const closeHour = ins.dailyCloseHour;
  const hours = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i);

  const totalSlots = hours.length;

  const weekLabel = `${formatDateShort(weekDays[0])} – ${formatDateShort(weekDays[6])}`;

  return (
    <div>
      <Link to="/instruments" className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-200 hover:text-phosphor-soft">
        <ArrowLeft size={13} /> 返回仪器列表
      </Link>

      <PageHeader
        eyebrow={`${ins.category} · ${ins.code}`}
        title={ins.name}
        description={`${ins.model} · ${ins.location}`}
        actions={
          <button
            className="btn-primary"
            disabled={ins.status === "maintenance"}
            onClick={() => setTarget({ instrumentId: ins.id })}
          >
            <CalendarPlus size={15} />
            预约此仪器
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Week calendar */}
        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-600/80 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-ink-50">本周预约时段</h2>
              <p className="text-xs text-ink-300">点击空闲时段即可发起预约 · 维护窗口自动屏蔽</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-subtle h-8 w-8 p-0"><ChevronLeft size={15} /></button>
              <span className="px-2 font-mono text-xs text-ink-100">{weekLabel}</span>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="btn-subtle h-8 w-8 p-0"><ChevronRight size={15} /></button>
              <button onClick={() => setWeekOffset(0)} className="btn-subtle ml-1 h-8 px-2 text-xs">本周</button>
            </div>
          </div>

          <div className="flex">
            {/* hour gutter */}
            <div className="w-12 shrink-0 pt-7">
              {hours.map((h) => (
                <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                  <span className="absolute -top-2 right-2 font-mono text-[9px] text-ink-300">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* day columns */}
            <div className="flex flex-1 gap-1 overflow-x-auto pb-2">
              {weekDays.map((day) => {
                const dKey = dayKey(day);
                const dayReservations = insReservations.filter(
                  (r) =>
                    dayKey(r.start) === dKey &&
                    r.status !== "cancelled" &&
                    r.status !== "rejected",
                );
                const isToday = dayKey(new Date()) === dKey;
                return (
                  <div key={dKey} className="min-w-[92px] flex-1">
                    <div className={cn("mb-1 pb-1 text-center", isToday && "rounded-md bg-phosphor/10")}>
                      <p className="text-[10px] text-ink-300">{weekdayCN(day)}</p>
                      <p className={cn("font-mono text-xs", isToday ? "text-phosphor-soft" : "text-ink-100")}>
                        {formatDateShort(day).split("/")[1]}
                      </p>
                    </div>
                    <div
                      className="relative"
                      style={{ height: totalSlots * HOUR_HEIGHT }}
                      onClick={(e) => {
                        if (e.target !== e.currentTarget) return;
                        const hour = openHour;
                        setTarget({ instrumentId: ins.id, date: day, startHour: hour, durationHours: 1 });
                      }}
                    >
                      {hours.map((h, idx) => {
                        const slotISO = `${dKey}T${String(h).padStart(2, "0")}:00`;
                        return (
                          <button
                            key={h}
                            onClick={() => setTarget({ instrumentId: ins.id, date: day, startHour: h, durationHours: 1 })}
                            className={cn(
                              "absolute left-0 right-0 border-t border-ink-600/40 transition-colors hover:bg-phosphor/5",
                              isBefore(slotISO, nowISO()) && "opacity-40",
                            )}
                            style={{ top: idx * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                            aria-label={`预约 ${formatDateShort(day)} ${h}:00`}
                          />
                        );
                      })}

                      {dayReservations.map((r) => {
                        const start = parseISO(r.start);
                        const end = parseISO(r.end);
                        const startH = start.getHours() + start.getMinutes() / 60;
                        const endH = end.getHours() + end.getMinutes() / 60;
                        const top = (startH - openHour) * HOUR_HEIGHT;
                        const height = (endH - startH) * HOUR_HEIGHT;
                        const rMeta = reservationStatusMeta[r.status];
                        const user = users.find((u) => u.id === r.userId)!;
                        const group = groups.find((g) => g.id === r.groupId)!;
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              "absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1.5 py-1 text-[9px] ring-1 ring-inset",
                              rMeta.bg,
                              rMeta.text,
                              rMeta.ring,
                            )}
                            style={{ top, height: Math.max(height - 2, 16) }}
                            title={`${formatTime(r.start)}–${formatTime(r.end)} · ${r.purpose}`}
                          >
                            <p className="font-mono font-semibold">{formatTime(r.start)}</p>
                            <p className="truncate">{user.name}</p>
                            <p className="truncate opacity-70">{group.shortName}</p>
                          </div>
                        );
                      })}

                      {insMaintenance.map((m) => {
                        const start = parseISO(m.start);
                        const end = parseISO(m.end);
                        if (dayKey(m.start) !== dKey && dayKey(m.end) !== dKey && !overlaps(m.start, m.end, dKey + "T00:00", dKey + "T23:59")) return null;
                        const startH = Math.max(start.getHours() + start.getMinutes() / 60, openHour);
                        const endH = Math.min(end.getHours() + end.getMinutes() / 60, closeHour);
                        if (endH <= startH) return null;
                        const top = (startH - openHour) * HOUR_HEIGHT;
                        const height = (endH - startH) * HOUR_HEIGHT;
                        return (
                          <div
                            key={m.id}
                            className="pointer-events-none absolute left-0 right-0 z-10 flex items-center gap-1 overflow-hidden rounded-md border border-dashed border-amberph/50 bg-amberph/10 px-1.5"
                            style={{ top, height: Math.max(height - 2, 12) }}
                          >
                            <Wrench size={9} className="shrink-0 text-amberph" />
                            <span className="truncate text-[9px] text-amberph">维护</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-ink-600/80 px-5 py-3 text-[10px] text-ink-300">
            <Legend color="bg-phosphor" label="使用中" />
            <Legend color="bg-skyph" label="已批准" />
            <Legend color="bg-amberph" label="待审核 / 维护" />
            <Legend color="bg-emeraldph" label="已完成" />
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-ink-50">运行状态</h3>
              <StatusBadge meta={meta} pulse={ins.status === "in_use"} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Ring value={util.rate} size={64} stroke={6} label={`${Math.round(util.rate)}%`} sublabel="利用率" />
              <div className="flex-1 space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-[10px] text-ink-300">
                    <span>近 30 日使用</span>
                    <span className="font-mono">{util.usedHours}h / {util.capacityHours}h</span>
                  </div>
                  <Bar value={util.rate} color="#2DD4BF" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[10px] text-ink-300">
                    <span>目标利用率</span>
                    <span className="font-mono text-amberph">{util.target}%</span>
                  </div>
                  <Bar value={util.target} color="#F59E0B" />
                </div>
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="mb-3 font-display text-sm font-semibold text-ink-50">设备信息</h3>
            <dl className="space-y-2.5 text-xs">
              <InfoRow icon={Cpu} label="型号" value={ins.model} />
              <InfoRow icon={MapPin} label="位置" value={ins.location} />
              <InfoRow icon={BookOpen} label="使用手册" value={ins.manual} />
              <InfoRow icon={History} label="启用日期" value={ins.acquisitionDate} />
              <InfoRow
                icon={ShieldCheck}
                label="持证要求"
                value={ins.requiresQualification ? "需持证独立预约" : "免资质"}
                tone={ins.requiresQualification ? "amber" : "phosphor"}
              />
            </dl>
            {ins.requiresQualification && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {requiredQuals.map((q) => (
                  <Chip key={q.id} tone="amber"><FileText size={11} />{q.name}</Chip>
                ))}
              </div>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="mb-2 font-display text-sm font-semibold text-ink-50">操作要求</h3>
            <p className="text-xs leading-relaxed text-ink-200">{ins.requirements}</p>
          </div>

          {insMaintenance.length > 0 && (
            <div className="panel p-5">
              <h3 className="mb-3 font-display text-sm font-semibold text-ink-50">维护计划</h3>
              <div className="space-y-2">
                {insMaintenance.map((m) => (
                  <div key={m.id} className="rounded-lg border border-amberph/20 bg-amberph/5 p-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-ink-50">{m.title}</p>
                      <Chip tone="amber">{m.recurrence === "none" ? "单次" : m.recurrence === "weekly" ? "每周" : m.recurrence === "monthly" ? "每月" : "每日"}</Chip>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-amberph">{formatDateTimeCN(m.start)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insLogs.length > 0 && (
            <div className="panel p-5">
              <h3 className="mb-3 font-display text-sm font-semibold text-ink-50">最近使用日志</h3>
              <div className="space-y-2.5">
                {insLogs.map((l) => {
                  const u = users.find((x) => x.id === l.userId)!;
                  const borderColor = l.instrumentStatus === "normal" ? "#34D399" : l.instrumentStatus === "minor_issue" ? "#F59E0B" : "#FB7185";
                  return (
                    <div key={l.id} className="border-l-2 pl-2.5" style={{ borderColor }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-50">{u.name}</span>
                        <span className="font-mono text-[10px] text-ink-300">{l.actualDurationHours}h</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-ink-300">{l.anomaly}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {target && (
        <ReservationModal open={!!target} onClose={() => setTarget(null)} target={target} />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-sm", color)} />
      {label}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  tone?: "default" | "amber" | "phosphor";
}) {
  const tones: Record<string, string> = {
    default: "text-ink-100",
    amber: "text-amberph",
    phosphor: "text-emeraldph",
  };
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="mt-0.5 shrink-0 text-ink-300" />
      <span className="w-16 shrink-0 text-ink-300">{label}</span>
      <span className={cn("flex-1 text-right", tones[tone])}>{value}</span>
    </div>
  );
}
