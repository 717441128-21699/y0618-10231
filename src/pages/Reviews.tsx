import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, isUserQualified } from "@/store/useStore";
import { PageHeader, EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, Chip } from "@/components/ui/Badge";
import { Avatar, GroupTag } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { reservationStatusMeta } from "@/lib/status";
import { formatDateTimeCN, rangeLabel, parseISO, overlaps } from "@/lib/date";
import { ShieldCheck, ShieldAlert, Check, X, Clock, AlertTriangle, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/types";

export default function Reviews() {
  const reservations = useStore((s) => s.reservations);
  const instruments = useStore((s) => s.instruments);
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);
  const qualifications = useStore((s) => s.qualifications);
  const qualificationRecords = useStore((s) => s.qualificationRecords);
  const maintenancePlans = useStore((s) => s.maintenancePlans);
  const approveReservation = useStore((s) => s.approveReservation);
  const rejectReservation = useStore((s) => s.rejectReservation);

  const [rejectTarget, setRejectTarget] = useState<Reservation | null>(null);
  const [reason, setReason] = useState("");

  const pending = useMemo(
    () => reservations.filter((r) => r.status === "pending").sort((a, b) => a.start.localeCompare(b.start)),
    [reservations],
  );

  const history = useMemo(
    () =>
      reservations
        .filter((r) => r.status === "approved" || r.status === "rejected")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [reservations],
  );

  const hasConflict = (r: Reservation): boolean => {
    return reservations.some(
      (o) =>
        o.id !== r.id &&
        o.instrumentId === r.instrumentId &&
        (o.status === "approved" || o.status === "in_progress") &&
        overlaps(o.start, o.end, r.start, r.end),
    );
  };

  const hasMaintConflict = (r: Reservation): boolean => {
    return maintenancePlans.some(
      (m) => m.instrumentId === r.instrumentId && overlaps(m.start, m.end, r.start, r.end),
    );
  };

  const doReject = () => {
    if (!rejectTarget) return;
    rejectReservation(rejectTarget.id, reason.trim() || "不符合预约要求");
    setRejectTarget(null);
    setReason("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="审核中心"
        title="预约审核队列"
        description="核验申请人资质与时段冲突，批准后锁定时段，驳回请填写原因。"
      />

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBox icon={Clock} label="待审核" value={pending.length} accent="#F59E0B" />
        <StatBox icon={Check} label="今日待处理" value={pending.filter((r) => parseISO(r.start).toDateString() === new Date().toDateString()).length} accent="#2DD4BF" />
        <StatBox icon={ShieldCheck} label="需资质审核" value={pending.filter((r) => instruments.find((i) => i.id === r.instrumentId)?.requiresQualification).length} accent="#A78BFA" />
        <StatBox icon={AlertTriangle} label="存在冲突" value={pending.filter((r) => hasConflict(r) || hasMaintConflict(r)).length} accent="#FB7185" />
      </div>

      {pending.length === 0 ? (
        <div className="panel mb-8">
          <EmptyState icon={ShieldCheck} title="审核队列已清空" description="当前没有待审核的预约申请，干得漂亮。" />
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {pending.map((r) => {
            const ins = instruments.find((i) => i.id === r.instrumentId)!;
            const u = users.find((x) => x.id === r.userId)!;
            const group = groups.find((g) => g.id === r.groupId)!;
            const qualified = isUserQualified(qualificationRecords, u.id, ins.qualificationIds);
            const conflict = hasConflict(r);
            const maintConflict = hasMaintConflict(r);
            const requiredQuals = qualifications.filter((q) => ins.qualificationIds.includes(q.id));
            return (
              <div key={r.id} className="panel p-4">
                <div className="flex flex-col gap-4 lg:flex-row">
                  {/* applicant + instrument */}
                  <div className="flex items-start gap-3 lg:w-80">
                    <Avatar name={u.name} color={u.avatarColor} size={40} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink-50">{u.name}</p>
                        <GroupTag shortName={group.shortName} color={group.color} />
                      </div>
                      <p className="text-[11px] text-ink-300">{u.title}</p>
                      <Link to={`/instruments/${ins.id}`} className="mt-1.5 block truncate text-xs text-phosphor-soft hover:underline">
                        {ins.name} · {ins.code}
                      </Link>
                    </div>
                  </div>

                  {/* details */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-phosphor-soft">{rangeLabel(r.start, r.end)}</span>
                      <span className="text-xs text-ink-300">{formatDateTimeCN(r.start)}</span>
                      <Chip tone="default">{r.durationHours}h</Chip>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-100">{r.purpose}</p>

                    {/* qualification check */}
                    {ins.requiresQualification && (
                      <div className={cn("mt-2.5 flex items-center gap-2 rounded-lg border px-3 py-2", qualified ? "border-emeraldph/30 bg-emeraldph/5" : "border-amberph/30 bg-amberph/5")}>
                        {qualified ? <ShieldCheck size={14} className="text-emeraldph" /> : <ShieldAlert size={14} className="text-amberph" />}
                        <span className={cn("text-xs font-medium", qualified ? "text-emeraldph" : "text-amberph")}>
                          {qualified ? "资质核验通过" : "资质未通过"}
                        </span>
                        <div className="ml-2 flex flex-wrap gap-1">
                          {requiredQuals.map((q) => (
                            <Chip key={q.id} tone={qualified ? "phosphor" : "amber"}>{q.abbr}</Chip>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* conflict warnings */}
                    {(conflict || maintConflict) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {conflict && (
                          <span className="chip bg-roseph/10 text-roseph ring-roseph/30">
                            <AlertTriangle size={11} /> 与已批准预约时段冲突
                          </span>
                        )}
                        {maintConflict && (
                          <span className="chip bg-amberph/10 text-amberph ring-amberph/30">
                            <AlertTriangle size={11} /> 与维护窗口冲突
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* actions */}
                  <div className="flex shrink-0 flex-col gap-2 lg:w-32">
                    <button
                      onClick={() => approveReservation(r.id, "已批准，请按时使用。")}
                      className="btn-primary text-xs"
                    >
                      <Check size={14} /> 批准
                    </button>
                    <button onClick={() => { setRejectTarget(r); setReason(""); }} className="btn-danger text-xs">
                      <X size={14} /> 驳回
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* history */}
      <div className="panel">
        <div className="border-b border-ink-600/80 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink-50">近期审核记录</h2>
          <p className="text-xs text-ink-300">最近 8 条已处理预约</p>
        </div>
        <div className="divide-y divide-ink-600/40">
          {history.map((r) => {
            const ins = instruments.find((i) => i.id === r.instrumentId)!;
            const u = users.find((x) => x.id === r.userId)!;
            const meta = reservationStatusMeta[r.status];
            return (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={u.name} color={u.avatarColor} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-ink-100">
                    <span className="text-ink-50">{u.name}</span> · {ins.name}
                  </p>
                  <p className="font-mono text-[10px] text-ink-300">{formatDateTimeCN(r.start)} · {r.purpose}</p>
                </div>
                {r.reviewNote && (
                  <span className="hidden max-w-xs truncate text-[11px] text-ink-300 sm:block">{r.reviewNote}</span>
                )}
                <StatusBadge meta={meta} />
              </div>
            );
          })}
          {history.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-300">暂无审核记录</p>
          )}
        </div>
      </div>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="驳回预约"
        subtitle={rejectTarget ? `${formatDateTimeCN(rejectTarget.start)}` : ""}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRejectTarget(null)}>取消</button>
            <button className="btn-danger" onClick={doReject}><ShieldQuestion size={14} /> 确认驳回</button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block tick-label">驳回原因（将通知申请人）</span>
          <textarea
            className="input min-h-[96px] resize-none"
            placeholder="例如：申请人未取得所需资质 / 时段与维护冲突 / 实验用途描述不清…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
          />
        </label>
      </Modal>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, accent }: { icon: typeof Clock; label: string; value: number; accent: string }) {
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
