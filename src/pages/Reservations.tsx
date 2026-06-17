import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageHeader, EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, Chip } from "@/components/ui/Badge";
import { GroupTag } from "@/components/ui/Avatar";
import { UsageLogModal } from "@/components/UsageLogModal";
import { reservationStatusMeta } from "@/lib/status";
import { formatDateTimeCN, rangeLabel, parseISO } from "@/lib/date";
import { CalendarCheck, X, ClipboardList, ChevronRight, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation, ReservationStatus } from "@/types";

const tabs: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已批准" },
  { value: "in_progress", label: "使用中" },
  { value: "completed", label: "已完成" },
  { value: "rejected", label: "已驳回" },
  { value: "cancelled", label: "已取消" },
];

export default function Reservations() {
  const reservations = useStore((s) => s.reservations);
  const instruments = useStore((s) => s.instruments);
  const groups = useStore((s) => s.groups);
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  const cancelReservation = useStore((s) => s.cancelReservation);

  const [tab, setTab] = useState<ReservationStatus | "all">("all");
  const [logTarget, setLogTarget] = useState<Reservation | null>(null);

  const mine = useMemo(
    () =>
      reservations
        .filter((r) => r.userId === currentUser.id)
        .filter((r) => tab === "all" || r.status === tab)
        .sort((a, b) => b.start.localeCompare(a.start)),
    [reservations, currentUser.id, tab],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    reservations.filter((r) => r.userId === currentUser.id).forEach((r) => {
      c.all++;
      c[r.status] = (c[r.status] ?? 0) + 1;
    });
    return c;
  }, [reservations, currentUser.id]);

  return (
    <div>
      <PageHeader
        eyebrow="我的预约"
        title="我的预约申请"
        description="跟踪你提交的仪器预约状态，使用完成后及时填写日志。"
      />

      <div className="panel mb-5 flex flex-wrap gap-1 p-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.value ? "bg-phosphor/15 text-phosphor-soft" : "text-ink-200 hover:bg-ink-700/50 hover:text-ink-50",
            )}
          >
            {t.label}
            {counts[t.value] > 0 && (
              <span className="font-mono text-[10px] opacity-70">{counts[t.value] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {mine.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={CalendarCheck}
            title="暂无相关预约"
            description="去预约日历选择仪器与空闲时段，发起你的第一次预约申请。"
            action={<Link to="/calendar" className="btn-primary"><FlaskConical size={15} />前往预约</Link>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {mine.map((r) => {
            const ins = instruments.find((i) => i.id === r.instrumentId)!;
            const group = groups.find((g) => g.id === r.groupId)!;
            const meta = reservationStatusMeta[r.status];
            const canCancel = r.status === "pending" || r.status === "approved";
            const canLog = (r.status === "approved" || r.status === "in_progress") && parseISO(r.end).getTime() < Date.now();
            return (
              <div key={r.id} className="panel panel-hover p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link to={`/instruments/${ins.id}`} className="flex shrink-0 items-center gap-3 sm:w-64">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-900/60 ring-1 ring-inset ring-ink-500 font-mono text-[10px] text-phosphor-soft">
                      {ins.code.split("-")[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-50">{ins.name}</p>
                      <p className="font-mono text-[10px] text-ink-300">{ins.code}</p>
                    </div>
                  </Link>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge meta={meta} pulse={r.status === "in_progress"} />
                      <GroupTag shortName={group.shortName} color={group.color} />
                      <Chip tone="default">{r.durationHours}h</Chip>
                    </div>
                    <p className="mt-1.5 font-mono text-xs text-phosphor-soft">{rangeLabel(r.start, r.end)} · {formatDateTimeCN(r.start)}</p>
                    <p className="mt-0.5 text-sm text-ink-100">{r.purpose}</p>
                    {r.reviewNote && r.status === "rejected" && (
                      <p className="mt-1 rounded-md bg-roseph/5 px-2 py-1 text-xs text-roseph">驳回原因：{r.reviewNote}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {canLog && (
                      <button onClick={() => setLogTarget(r)} className="btn-primary text-xs">
                        <ClipboardList size={13} /> 填写日志
                      </button>
                    )}
                    {canCancel && (
                      <button onClick={() => cancelReservation(r.id)} className="btn-ghost text-xs">
                        <X size={13} /> 取消
                      </button>
                    )}
                    <Link to={`/instruments/${ins.id}`} className="btn-subtle h-8 w-8 p-0">
                      <ChevronRight size={15} />
                    </Link>
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
