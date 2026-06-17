import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, maintenanceOccurrences } from "@/store/useStore";
import { PageHeader } from "@/components/ui/EmptyState";
import { ReservationModal } from "@/components/ReservationModal";
import { Chip } from "@/components/ui/Badge";
import { reservationStatusMeta, instrumentStatusMeta } from "@/lib/status";
import { addDays, dayKey, formatDateTimeCN, formatTime, parseISO, weekdayCN, nowISO, isBefore, dayKey as dk } from "@/lib/date";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MousePointerClick,
  ShieldCheck,
  Clock,
  Search,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReservationTarget } from "@/components/ReservationModal";
import type { MaintenancePlan } from "@/types";

const GLOBAL_OPEN = 0;
const GLOBAL_CLOSE = 24;
const GLOBAL_SPAN = GLOBAL_CLOSE - GLOBAL_OPEN;

export default function Calendar() {
  const instruments = useStore((s) => s.instruments);
  const reservations = useStore((s) => s.reservations);
  const maintenancePlans = useStore((s) => s.maintenancePlans);
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);
  const qualifications = useStore((s) => s.qualifications);
  const qualificationRecords = useStore((s) => s.qualificationRecords);
  const currentUserId = useStore((s) => s.currentUserId);

  const [day, setDay] = useState(() => new Date());
  const [target, setTarget] = useState<ReservationTarget | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [precheckId, setPrecheckId] = useState<string | null>(null);

  const dKey = dayKey(day);
  const isToday = dKey === dayKey(new Date());
  const rangeStart = `${dKey}T00:00`;
  const rangeEnd = `${dKey}T23:59`;

  const precheckInstrument = precheckId ? instruments.find((i) => i.id === precheckId) : null;
  const precheckUser = users.find((u) => u.id === currentUserId);

  const precheck = useMemo(() => {
    if (!precheckInstrument) return null;
    const ins = precheckInstrument;
    const openH = ins.dailyOpenHour;
    const closeH = ins.dailyCloseHour;

    const dayRes = reservations.filter(
      (r) =>
        r.instrumentId === ins.id &&
        dayKey(r.start) === dKey &&
        r.status !== "cancelled" &&
        r.status !== "rejected",
    );
    const dayMaint = maintenanceOccurrences(maintenancePlans, ins.id, rangeStart, rangeEnd);

    // build busy intervals
    type Interval = { start: number; end: number; type: "reservation" | "maintenance"; data: unknown };
    const busy: Interval[] = [];
    dayRes.forEach((r) => {
      const s = parseISO(r.start);
      const e = parseISO(r.end);
      busy.push({
        start: s.getHours() + s.getMinutes() / 60,
        end: e.getHours() + e.getMinutes() / 60,
        type: "reservation",
        data: r,
      });
    });
    dayMaint.forEach((m) => {
      const s = parseISO(m.start);
      const e = parseISO(m.end);
      busy.push({
        start: Math.max(openH, s.getHours() + s.getMinutes() / 60),
        end: Math.min(closeH, e.getHours() + e.getMinutes() / 60),
        type: "maintenance",
        data: m,
      });
    });
    busy.sort((a, b) => a.start - b.start);

    // merge overlapping busy and find free slots
    const merged: Interval[] = [];
    busy.forEach((b) => {
      if (b.end <= b.start) return;
      if (merged.length === 0 || b.start > merged[merged.length - 1].end) {
        merged.push({ ...b });
      } else {
        const last = merged[merged.length - 1];
        last.end = Math.max(last.end, b.end);
      }
    });

    const freeSlots: { start: number; end: number; hours: number }[] = [];
    let cursor = openH;
    merged.forEach((b) => {
      if (b.start > cursor) {
        freeSlots.push({ start: cursor, end: b.start, hours: b.start - cursor });
      }
      cursor = Math.max(cursor, b.end);
    });
    if (cursor < closeH) {
      freeSlots.push({ start: cursor, end: closeH, hours: closeH - cursor });
    }

    const usableFree = freeSlots.filter((s) => s.hours >= 0.5);

    // qualification check
    const qualStatus: "qualified" | "missing" | "not_required" = ins.requiresQualification
      ? qualificationRecords.some(
          (qr) =>
            qr.userId === currentUserId &&
            ins.qualificationIds.includes(qr.qualificationId) &&
            parseISO(qr.expireAt) > new Date(),
        )
        ? "qualified"
        : "missing"
      : "not_required";

    const requiredQualNames = ins.qualificationIds
      .map((qid) => qualifications.find((q) => q.id === qid)?.name)
      .filter(Boolean) as string[];

    return {
      instrument: ins,
      openHour: openH,
      closeHour: closeH,
      openRange: `${String(openH).padStart(2, "0")}:00 – ${String(closeH).padStart(2, "0")}:00`,
      reservations: dayRes,
      maintenance: dayMaint,
      freeSlots: usableFree,
      qualStatus,
      requiredQualNames,
      totalFreeHours: usableFree.reduce((sum, s) => sum + s.hours, 0),
    };
  }, [
    precheckInstrument,
    dKey,
    reservations,
    maintenancePlans,
    rangeStart,
    rangeEnd,
    qualificationRecords,
    currentUserId,
    qualifications,
  ]);

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

      {/* Precheck panel */}
      <div className="panel mb-5">
        <div className="flex flex-col gap-3 border-b border-ink-600/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-phosphor-soft" />
            <p className="text-sm font-medium text-ink-50">预约预检</p>
            <span className="text-[10px] text-ink-300">选好仪器和日期，提前看当日占用与推荐空档</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <select
              className="input pl-9 w-full"
              value={precheckId ?? ""}
              onChange={(e) => setPrecheckId(e.target.value || null)}
            >
              <option value="">选择要预检的仪器…</option>
              {instruments.filter((i) => i.status !== "offline").map((i) => (
                <option key={i.id} value={i.id}>{i.name} · {i.model}</option>
              ))}
            </select>
          </div>
        </div>

        {precheck && precheckUser ? (
          <div className="px-5 py-4">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PrecheckCard
                icon={Clock}
                label="开放时间"
                value={precheck.openRange}
                tone="#2DD4BF"
              />
              <PrecheckCard
                icon={CalendarDays}
                label="当日预约"
                value={`${precheck.reservations.length} 条`}
                tone="#38BDF8"
              />
              <PrecheckCard
                icon={ShieldCheck}
                label="资质状态"
                value={precheck.qualStatus === "qualified" ? "已持证" : precheck.qualStatus === "missing" ? "待认证" : "无需"}
                tone={precheck.qualStatus === "qualified" ? "#34D399" : precheck.qualStatus === "missing" ? "#F59E0B" : "#94A3B8"}
              />
              <PrecheckCard
                icon={Zap}
                label="可用空档"
                value={`${precheck.freeSlots.length} 段 / ${precheck.totalFreeHours.toFixed(1)}h`}
                tone="#A78BFA"
              />
            </div>

            {precheck.qualStatus === "missing" && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-amberph/10 p-3 ring-1 ring-inset ring-amberph/30">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amberph" />
                <div className="text-xs text-amberph/90">
                  <p className="font-medium">需持证操作</p>
                  <p className="mt-0.5">该仪器要求具备资质：{precheck.requiredQualNames.join("、")}。未认证也可提交预约，但可能被管理员驳回。</p>
                </div>
              </div>
            )}

            {precheck.maintenance.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-medium text-ink-200">当日维护窗口</p>
                <div className="flex flex-wrap gap-2">
                  {precheck.maintenance.map((m, i) => (
                    <Chip key={i} tone="amber">
                      ⚙ {formatTime(m.start)}–{formatTime(m.end)} · {m.plan.title}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-medium text-ink-200">推荐空闲时段（≥30 分钟）</p>
                <span className="text-[10px] text-ink-300">点击任意空档快速预约</span>
              </div>
              {precheck.freeSlots.length === 0 ? (
                <div className="rounded-lg bg-ink-900/40 p-4 text-center text-xs text-ink-300">
                  当日无可预约空档，建议换一天试试
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {precheck.freeSlots.map((slot, i) => {
                    const startH = Math.floor(slot.start);
                    const startM = Math.round((slot.start - startH) * 60);
                    const endH = Math.floor(slot.end);
                    const endM = Math.round((slot.end - endH) * 60);
                    const label = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} – ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")} · ${slot.hours.toFixed(1)}h`;
                    const isPast = isBefore(`${dKey}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`, nowISO());
                    return (
                      <button
                        key={i}
                        disabled={isPast || precheck.instrument.status === "maintenance"}
                        onClick={() => {
                          const h = Math.max(startH, precheck.openHour);
                          setTarget({
                            instrumentId: precheck.instrument.id,
                            date: new Date(day),
                            startHour: h,
                            durationHours: Math.min(Math.floor(slot.hours), 4),
                          });
                        }}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-[11px] font-mono transition-colors",
                          isPast || precheck.instrument.status === "maintenance"
                            ? "cursor-not-allowed border-ink-600/60 bg-ink-900/30 text-ink-400"
                            : "border-phosphor/30 bg-phosphor/5 text-phosphor-soft hover:bg-phosphor/10",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-ink-300">
            <Search size={20} className="mx-auto mb-2 text-ink-400" />
            <p>选择一台仪器，查看当日预约、维护、持证状态与推荐空档</p>
          </div>
        )}
      </div>

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

function PrecheckCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg bg-ink-900/40 p-3 ring-1 ring-inset ring-ink-600/60">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-inset"
          style={{ color: tone, background: `${tone}10`, borderColor: `${tone}30` }}
        >
          <Icon size={13} />
        </span>
        <span className="text-[10px] text-ink-300">{label}</span>
      </div>
      <p className="mt-2 font-mono text-sm font-semibold" style={{ color: tone }}>{value}</p>
    </div>
  );
}

void dk;
