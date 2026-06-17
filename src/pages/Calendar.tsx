import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, maintenanceOccurrences } from "@/store/useStore";
import { PageHeader } from "@/components/ui/EmptyState";
import { ReservationModal } from "@/components/ReservationModal";
import { reservationStatusMeta, instrumentStatusMeta } from "@/lib/status";
import { addDays, dayKey, formatDateTimeCN, formatTime, parseISO, weekdayCN, nowISO, isBefore, dayKey as dk } from "@/lib/date";
import { ChevronLeft, ChevronRight, CalendarDays, MousePointerClick, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReservationTarget } from "@/components/ReservationModal";
import type { MaintenancePlan } from "@/types";

const GLOBAL_OPEN = 8;
const GLOBAL_CLOSE = 22;
const GLOBAL_SPAN = GLOBAL_CLOSE - GLOBAL_OPEN;

export default function Calendar() {
  const instruments = useStore((s) => s.instruments);
  const reservations = useStore((s) => s.reservations);
  const maintenancePlans = useStore((s) => s.maintenancePlans);
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);

  const [day, setDay] = useState(() => new Date());
  const [target, setTarget] = useState<ReservationTarget | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const dKey = dayKey(day);
  const isToday = dKey === dayKey(new Date());
  const rangeStart = `${dKey}T00:00`;
  const rangeEnd = `${dKey}T23:59`;

  const dayResByInstrument = useMemo(() => {
    const map = new Map<string, typeof reservations>();
    instruments.forEach((i) => map.set(i.id, []));
    reservations.forEach((r) => {
      if (dayKey(r.start) !== dKey) return;
      if (r.status === "cancelled" || r.status === "rejected") return;
      map.get(r.instrumentId)?.push(r);
    });
    return map;
  }, [reservations, instruments, dKey]);

  const maintByInstrument = useMemo(() => {
    const map = new Map<string, { start: string; end: string; plan: MaintenancePlan }[]>();
    instruments.forEach((i) => {
      map.set(i.id, maintenanceOccurrences(maintenancePlans, i.id, rangeStart, rangeEnd));
    });
    return map;
  }, [maintenancePlans, instruments, rangeStart, rangeEnd]);

  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>, instrumentId: string) => {
    const ins = instruments.find((x) => x.id === instrumentId)!;
    const openH = ins.dailyOpenHour;
    const closeH = ins.dailyCloseHour;
    if (closeH <= openH) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // click only meaningful within [openH, closeH] as rendered
    const left = ((openH - GLOBAL_OPEN) / GLOBAL_SPAN) * rect.width;
    const right = ((closeH - GLOBAL_OPEN) / GLOBAL_SPAN) * rect.width;
    const x = Math.min(Math.max(e.clientX - rect.left, left), right - 1);
    const hourFloat = ((x - left) / (right - left)) * (closeH - openH) + openH;
    const hour = Math.max(openH, Math.min(closeH - 1, Math.floor(hourFloat)));
    const maintNow = maintByInstrument.get(instrumentId) ?? [];
    const clickedStart = `${dKey}T${String(hour).padStart(2, "0")}:00`;
    const clickedEnd = `${dKey}T${String(hour + 1).padStart(2, "0")}:00`;
    const blocked = maintNow.some(
      (m) => parseISO(m.start) < parseISO(clickedEnd) && parseISO(m.end) > parseISO(clickedStart),
    );
    if (blocked || isBefore(clickedEnd, nowISO()) || ins.status === "offline" || ins.status === "maintenance") {
      return;
    }
    setTarget({ instrumentId, date: day, startHour: hour, durationHours: 1 });
  };

  return (
    <div>
      <PageHeader
        eyebrow="预约中心"
        title="跨仪器预约日历"
        description="以仪器为行、时段为列查看当日占用，点击空闲时段即可发起预约；维护窗口按精确小时段自动屏蔽。"
        actions={
          <div className="flex items-center gap-1">
            <button onClick={() => setDay((d) => addDays(d, -1))} className="btn-subtle h-9 w-9 p-0"><ChevronLeft size={16} /></button>
            <button onClick={() => setDay(new Date())} className="btn-ghost h-9 px-3 text-xs">今天</button>
            <button onClick={() => setDay((d) => addDays(d, 1))} className="btn-subtle h-9 w-9 p-0"><ChevronRight size={16} /></button>
          </div>
        }
      />

      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-600/80 px-5 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-phosphor-soft" />
            <span className={cn("font-display text-sm font-semibold", isToday ? "text-phosphor-soft" : "text-ink-50")}>
              {formatDateTimeCN(day).split(" ")[0]} {weekdayCN(day)}
            </span>
            {isToday && <span className="chip bg-phosphor/10 text-phosphor-soft ring-phosphor/30">今天</span>}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-ink-300">
            <Legend color="bg-phosphor" label="使用中" />
            <Legend color="bg-skyph" label="已批准" />
            <Legend color="bg-amberph" label="待审核 / 维护" />
            <Legend color="bg-emeraldph" label="已完成" />
            <span className="hidden items-center gap-1 sm:flex">
              <MousePointerClick size={11} /> 点击空闲时段预约
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            {/* hour ruler */}
            <div className="flex border-b border-ink-600/60">
              <div className="w-56 shrink-0 px-4 py-2 tick-label">仪器 / 开放时段</div>
              <div className="relative flex-1">
                <div className="flex">
                  {Array.from({ length: GLOBAL_SPAN }, (_, i) => GLOBAL_OPEN + i).map((h) => (
                    <div key={h} className="flex-1 border-l border-ink-600/40 py-1.5 text-center font-mono text-[9px] text-ink-300">
                      {String(h).padStart(2, "0")}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* instrument rows */}
            <div className="divide-y divide-ink-600/40">
              {instruments.map((ins) => {
                const openH = ins.dailyOpenHour;
                const closeH = ins.dailyCloseHour;
                const span = Math.max(closeH - openH, 0);
                const leftPct = ((openH - GLOBAL_OPEN) / GLOBAL_SPAN) * 100;
                const widthPct = (span / GLOBAL_SPAN) * 100;

                const dayRes = dayResByInstrument.get(ins.id) ?? [];
                const dayMaint = maintByInstrument.get(ins.id) ?? [];
                const insMeta = instrumentStatusMeta[ins.status];
                const offlineOrMaint = ins.status === "offline" || ins.status === "maintenance";

                return (
                  <div key={ins.id} className="flex items-stretch hover:bg-ink-700/20">
                    <Link
                      to={`/instruments/${ins.id}`}
                      className="flex w-56 shrink-0 items-center gap-2 px-4 py-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-900/60 ring-1 ring-inset ring-ink-500 text-[10px] font-mono text-phosphor-soft">
                        {ins.code.split("-")[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-medium text-ink-50">{ins.name}</p>
                          <span className={cn("chip", insMeta.bg, insMeta.text, insMeta.ring)} style={{ padding: "1px 5px" }}>
                            {insMeta.label}
                          </span>
                        </div>
                        <p className="flex items-center gap-2 font-mono text-[9px] text-ink-300">
                          <Clock size={9} />
                          {String(openH).padStart(2, "0")}:00 – {String(closeH).padStart(2, "0")}:00
                          {ins.requiresQualification && (
                            <span className="flex items-center gap-0.5 text-amberph"><ShieldCheck size={9} />需证</span>
                          )}
                        </p>
                      </div>
                    </Link>

                    <div
                      className={cn(
                        "relative flex-1",
                        !offlineOrMaint && "cursor-crosshair",
                        offlineOrMaint && "cursor-not-allowed opacity-60",
                      )}
                      style={{ height: 56 }}
                      onClick={(e) => !offlineOrMaint && handleRowClick(e, ins.id)}
                      onMouseEnter={() => setHovered(ins.id)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {/* vertical time tick dividers */}
                      {Array.from({ length: GLOBAL_SPAN + 1 }, (_, i) => (
                        <span
                          key={`g-${i}`}
                          className="absolute top-0 h-full border-l border-ink-600/30"
                          style={{ left: `${(i / GLOBAL_SPAN) * 100}%` }}
                        />
                      ))}

                      {/* closed outside open hours — grey dim strip */}
                      <div
                        className="absolute top-0 bottom-0 bg-ink-900/60"
                        style={{ left: 0, width: `${leftPct}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 bg-ink-900/60"
                        style={{ left: `${leftPct + widthPct}%`, right: 0 }}
                      />

                      {/* open window */}
                      <div
                        className={cn(
                          "absolute top-1 bottom-1 rounded-md border border-phosphor/10",
                          hovered === ins.id && !offlineOrMaint && "bg-phosphor/[0.04]",
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      />

                      {/* maintenance blocks (exact hour precision) */}
                      {dayMaint.map((m, idx) => {
                        const s = parseISO(m.start);
                        const e = parseISO(m.end);
                        const sH = s.getHours() + s.getMinutes() / 60;
                        const eH = e.getHours() + e.getMinutes() / 60;
                        const clampStart = Math.max(sH, openH, GLOBAL_OPEN);
                        const clampEnd = Math.min(eH, closeH, GLOBAL_CLOSE);
                        if (clampEnd <= clampStart) return null;
                        const mL = ((clampStart - GLOBAL_OPEN) / GLOBAL_SPAN) * 100;
                        const mW = ((clampEnd - clampStart) / GLOBAL_SPAN) * 100;
                        return (
                          <div
                            key={`${m.plan.id}-${idx}`}
                            className="absolute top-1 bottom-1 z-10 flex items-center justify-center overflow-hidden rounded-md border border-dashed border-amberph/50 bg-amberph/10 px-2 text-[9px] text-amberph"
                            style={{ left: `${mL}%`, width: `${mW}%` }}
                            title={`维护：${m.plan.title} · ${formatTime(m.start)}–${formatTime(m.end)}`}
                          >
                            {((clampEnd - clampStart) >= 1.2) ? (
                              <span className="truncate">{m.plan.title}</span>
                            ) : (
                              <span className="font-mono">⚙ {formatTime(m.start)}</span>
                            )}
                          </div>
                        );
                      })}

                      {/* reservation bars */}
                      {dayRes.map((r) => {
                        const s = parseISO(r.start);
                        const e = parseISO(r.end);
                        const sH = s.getHours() + s.getMinutes() / 60;
                        const eH = e.getHours() + e.getMinutes() / 60;
                        const left = ((sH - GLOBAL_OPEN) / GLOBAL_SPAN) * 100;
                        const width = ((eH - sH) / GLOBAL_SPAN) * 100;
                        const meta = reservationStatusMeta[r.status];
                        const user = users.find((u) => u.id === r.userId)!;
                        const group = groups.find((g) => g.id === r.groupId)!;
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              "absolute top-2 bottom-2 z-20 flex items-center gap-1 overflow-hidden rounded px-2 text-[10px] ring-1 ring-inset",
                              meta.bg,
                              meta.text,
                              meta.ring,
                            )}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${formatTime(r.start)}–${formatTime(r.end)} · ${user.name}（${group.shortName}）· ${r.purpose}`}
                          >
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: group.color }} />
                            {width > 8 && <span className="truncate font-medium">{user.name}</span>}
                            {width > 14 && <span className="hidden truncate opacity-70 sm:inline">{group.shortName}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

void dk;
