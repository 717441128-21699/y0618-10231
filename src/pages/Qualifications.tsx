import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Badge";
import { parseISO, formatDateShort } from "@/lib/date";
import { Award, ShieldCheck, ShieldAlert, ShieldX, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualificationRecord } from "@/types";

type QStatus = "valid" | "expiring" | "expired" | "none";

function qStatus(rec: QualificationRecord | undefined): QStatus {
  if (!rec) return "none";
  const now = Date.now();
  const exp = parseISO(rec.expireAt).getTime();
  if (exp < now) return "expired";
  if (exp < now + 30 * 86_400_000) return "expiring";
  return "valid";
}

const statusVisual: Record<QStatus, { label: string; cls: string; icon: typeof ShieldCheck }> = {
  valid: { label: "有效", cls: "bg-emeraldph/10 text-emeraldph ring-emeraldph/30", icon: ShieldCheck },
  expiring: { label: "即将到期", cls: "bg-amberph/10 text-amberph ring-amberph/30", icon: Clock },
  expired: { label: "已过期", cls: "bg-roseph/10 text-roseph ring-roseph/30", icon: ShieldX },
  none: { label: "未认证", cls: "bg-ink-700/40 text-ink-300 ring-ink-500", icon: ShieldAlert },
};

export default function Qualifications() {
  const users = useStore((s) => s.users);
  const qualifications = useStore((s) => s.qualifications);
  const records = useStore((s) => s.qualificationRecords);
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  const approveQualification = useStore((s) => s.approveQualification);

  const recordMap = useMemo(() => {
    const map = new Map<string, QualificationRecord>();
    records.forEach((r) => map.set(`${r.userId}-${r.qualificationId}`, r));
    return map;
  }, [records]);

  const stats = useMemo(() => {
    let valid = 0, expiring = 0, expired = 0;
    users.forEach((u) =>
      qualifications.forEach((q) => {
        const s = qStatus(recordMap.get(`${u.id}-${q.id}`));
        if (s === "valid") valid++;
        else if (s === "expiring") expiring++;
        else if (s === "expired") expired++;
      }),
    );
    return { valid, expiring, expired };
  }, [users, qualifications, recordMap]);

  const isDirector = currentUser.role === "director";

  const grant = (userId: string, qualificationId: string, months: number) => {
    approveQualification(userId, qualificationId, months);
  };

  return (
    <div>
      <PageHeader
        eyebrow="资质管理"
        title="人员资质认证矩阵"
        description="管理仪器操作资质认证与有效期；持证方可独立预约需资质的仪器。"
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat icon={ShieldCheck} label="有效认证" value={stats.valid} accent="#34D399" />
        <Stat icon={Clock} label="即将到期" value={stats.expiring} accent="#F59E0B" />
        <Stat icon={ShieldX} label="已过期" value={stats.expired} accent="#FB7185" />
      </div>

      <div className="panel">
        <div className="flex items-center justify-between border-b border-ink-600/80 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink-50">资质认证矩阵</h2>
            <p className="text-xs text-ink-300">
              {isDirector ? "点击「认证/续期」为人员授予或更新资质" : "查看人员持证状态（仅主管可认证）"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {qualifications.map((q) => (
              <Chip key={q.id} tone="violet"><Award size={11} />{q.abbr}</Chip>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-600/60 tick-label">
                <th className="sticky left-0 z-10 bg-ink-800/95 px-5 py-3 text-left font-medium">人员 / 课题组</th>
                {qualifications.map((q) => (
                  <th key={q.id} className="px-3 py-3 text-center font-medium">
                    <div className="flex flex-col items-center gap-1">
                      <span className="rounded bg-violeph/10 px-1.5 py-0.5 font-mono text-[10px] text-violeph ring-1 ring-inset ring-violeph/30">{q.abbr}</span>
                      <span className="font-sans text-[9px] normal-case tracking-normal text-ink-300">{q.validityMonths}月</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600/40">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-ink-700/20">
                  <td className="sticky left-0 z-10 bg-ink-800/95 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} color={u.avatarColor} size={28} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink-50">{u.name}</p>
                        <p className="truncate text-[10px] text-ink-300">{u.title}</p>
                      </div>
                    </div>
                  </td>
                  {qualifications.map((q) => {
                    const rec = recordMap.get(`${u.id}-${q.id}`);
                    const st = qStatus(rec);
                    const visual = statusVisual[st];
                    const Icon = visual.icon;
                    return (
                      <td key={q.id} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={cn("chip", visual.cls)}>
                            <Icon size={10} />
                            {rec ? formatDateShort(rec.expireAt) : "—"}
                          </span>
                          {isDirector && (
                            <button
                              onClick={() => grant(u.id, q.id, q.validityMonths)}
                              className="inline-flex items-center gap-0.5 text-[10px] text-phosphor-soft/80 hover:text-phosphor-soft"
                            >
                              <Plus size={9} />
                              {st === "none" ? "认证" : "续期"}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* qualification definitions */}
      <div className="mt-6 panel">
        <div className="border-b border-ink-600/80 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink-50">资质项目定义</h2>
          <p className="text-xs text-ink-300">系统内认证的仪器操作资质</p>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {qualifications.map((q) => {
            const holderCount = users.filter((u) => {
              const s = qStatus(recordMap.get(`${u.id}-${q.id}`));
              return s === "valid" || s === "expiring";
            }).length;
            return (
              <div key={q.id} className="rounded-xl border border-ink-600 bg-ink-900/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-violeph/10 px-2 py-0.5 font-mono text-[10px] text-violeph ring-1 ring-inset ring-violeph/30">{q.abbr}</span>
                  <Chip tone="default">{holderCount} 人持证</Chip>
                </div>
                <p className="mt-2 text-sm font-medium text-ink-50">{q.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-200">{q.description}</p>
                <p className="mt-2 font-mono text-[10px] text-ink-300">有效期 {q.validityMonths} 个月</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Award; label: string; value: number; accent: string }) {
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
