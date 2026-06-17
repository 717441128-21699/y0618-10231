import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/ui/EmptyState";
import { ReservationModal } from "@/components/ReservationModal";
import { reservationStatusMeta } from "@/lib/status";
import { addDays, dayKey, formatDateTimeCN, formatTime, parseISO, weekdayCN } from "@/lib/date";
import { ChevronLeft, ChevronRight, CalendarDays, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReservationTarget } from "@/components/ReservationModal";

const OPEN = 8;
const CLOSE = 22;
const SPAN = CLOSE - OPEN;

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

  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>, instrumentId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hourFloat = (x / rect.width) * SPAN + OPEN;
    const hour = Math.max(OPEN, Math.min(CLOSE - 1, Math.floor(hourFloat)));
    setTarget({ instrumentId, date: day, startHour: hour, durationHours: 1 });
  };

  return (
    <div>
      <PageHeader
        eyebrow="预约中心"
        title="跨仪器预约日历"
        description="以仪器为行、时段为列查看当日占用，点击空闲时段即可发起预约；维护窗口自动屏蔽。"
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
            <Legend color="bg-amberph" label="待审核/维护" />
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
              <div className="w-44 shrink-0 px-4 py-2 tick-label">仪器</div>
              <div className="relative flex-1">
                <div className="flex">
                  {Array.from({ length: SPAN }, (_, i) => OPEN + i).map((h) => (
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
                const dayRes = dayResByInstrument.get(ins.id) ?? [];
                const isMaintenanceDay = maintenancePlans.some(
                  (m) => m.instrumentId === ins.id && m.start <= `${dKey}T23:59` && m.end >= `${dKey}T00:00`,
                );
                return (
                  <div key={ins.id} className="flex items-stretch hover:bg-ink-700/20">
                    <Link
                      to={`/instruments/${ins.id}`}
                      className="flex w-44 shrink-0 items-center gap-2 px-4 py-3"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-900/60 ring-1 ring-inset ring-ink-500 text-[10px] font-mono text-phosphor-soft">
                        {ins.code.split("-")[0]}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink-50">{ins.name}</p>
                        <p className="font-mono text-[9px] text-ink-300">{ins.code}</p>
                      </div>
                    </Link>
                    <div
                      className="relative flex-1 cursor-crosshair"
                      style={{ height: 52 }}
                      onClick={(e) => !isMaintenanceDay && handleRowClick(e, ins.id)}
                      onMouseEnter={() => setHovered(ins.id)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {/* hour gridlines */}
                      {Array.from({ length: SPAN }, (_, i) => (
                        <span
                          key={i}
                          className="absolute top-0 h-full border-l border-ink-600/30"
                          style={{ left: `${(i / SPAN) * 100}%` }}
                        />
                      ))}
                      {hovered === ins.id && !isMaintenanceDay && (
                        <div className="pointer-events-none absolute inset-0 bg-phosphor/[0.03]" />
                      )}

                      {/* maintenance overlay */}
                      {isMaintenanceDay && (
                        <div className="absolute inset-0 flex items-center justify-center bg-amberph/10 text-[10px] text-amberph">
                          维护屏蔽 · 不可预约
                        </div>
                      )}

                      {/* reservation bars */}
                      {!isMaintenanceDay &&
                        dayRes.map((r) => {
                          const start = parseISO(r.start);
                          const end = parseISO(r.end);
                          const startH = start.getHours() + start.getMinutes() / 60;
                          const endH = end.getHours() + end.getMinutes() / 60;
                          const left = ((startH - OPEN) / SPAN) * 100;
                          const width = ((endH - startH) / SPAN) * 100;
                          const meta = reservationStatusMeta[r.status];
                          const user = users.find((u) => u.id === r.userId)!;
                          const group = groups.find((g) => g.id === r.groupId)!;
                          return (
                            <div
                              key={r.id}
                              className={cn(
                                "absolute top-1 bottom-1 flex items-center gap-1 overflow-hidden rounded px-2 text-[10px] ring-1 ring-inset",
                                meta.bg,
                                meta.text,
                                meta.ring,
                              )}
                              style={{ left: `${left}%`, width: `${width}%` }}
                              title={`${formatTime(r.start)}–${formatTime(r.end)} · ${user.name}（${group.shortName}）· ${r.purpose}`}
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: group.color }} />
                              <span className="truncate font-medium">{user.name}</span>
                              {width > 18 && <span className="truncate opacity-70">{group.shortName}</span>}
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
