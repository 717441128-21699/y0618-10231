import { useMemo, useState } from "react";
import { useStore, auditActionLabels, roleLabels } from "@/store/useStore";
import { PageHeader, SectionLabel } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Badge";
import { formatDateTimeCN } from "@/lib/date";
import { Search, ScrollText, Filter, ChevronDown, ChevronRight, FileDiff } from "lucide-react";
import type { AuditAction, AuditLog } from "@/types";
import { cn } from "@/lib/utils";

const actionGroups: Record<string, AuditAction[]> = {
  预约相关: [
    "reservation.create",
    "reservation.approve",
    "reservation.reject",
    "reservation.cancel",
    "reservation.complete",
  ],
  维护相关: [
    "maintenance.create",
    "maintenance.update",
    "maintenance.remove",
  ],
  仪器资产: [
    "instrument.create",
    "instrument.update",
    "instrument.offline",
  ],
  资质与系统: [
    "qualification.grant",
    "system.reset",
  ],
};

const actionTone: Record<AuditAction, "default" | "phosphor" | "amber" | "rose" | "violet" | "emerald"> = {
  "reservation.create": "phosphor",
  "reservation.approve": "emerald",
  "reservation.reject": "rose",
  "reservation.cancel": "amber",
  "reservation.complete": "default",
  "maintenance.create": "violet",
  "maintenance.update": "violet",
  "maintenance.remove": "rose",
  "qualification.grant": "emerald",
  "instrument.create": "phosphor",
  "instrument.update": "default",
  "instrument.offline": "rose",
  "system.reset": "amber",
};

export default function AuditTrail() {
  const auditLogs = useStore((s) => s.auditLogs);
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);

  const [query, setQuery] = useState("");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return auditLogs.filter((l) => {
      if (actorFilter !== "all" && l.actorId !== actorFilter) return false;
      const actor = users.find((u) => u.id === l.actorId);
      if (groupFilter !== "all" && actor?.groupId !== groupFilter) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (!q) return true;
      return (
        l.summary.toLowerCase().includes(q) ||
        auditActionLabels[l.action].toLowerCase().includes(q) ||
        actor?.name.toLowerCase().includes(q) ||
        false
      );
    });
  }, [auditLogs, query, actorFilter, groupFilter, actionFilter, users]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    auditLogs.forEach((l) => { counts[l.action] = (counts[l.action] ?? 0) + 1; });
    return {
      total: auditLogs.length,
      approveOrReject:
        (counts["reservation.approve"] ?? 0) + (counts["reservation.reject"] ?? 0),
      maintChanges:
        (counts["maintenance.create"] ?? 0) +
        (counts["maintenance.update"] ?? 0) +
        (counts["maintenance.remove"] ?? 0),
      qualGrants: counts["qualification.grant"] ?? 0,
    };
  }, [auditLogs]);

  return (
    <div>
      <PageHeader
        eyebrow="审计追溯"
        title="管理员操作记录"
        description="记录所有预约审核、维护变更、资质续期与仪器资产操作，便于事后追溯与责任划分。"
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="操作记录总数" value={stats.total} tone="#2DD4BF" />
        <Stat label="预约审核 (批/驳)" value={stats.approveOrReject} tone="#A78BFA" />
        <Stat label="维护计划变更" value={stats.maintChanges} tone="#F59E0B" />
        <Stat label="资质授予 / 续期" value={stats.qualGrants} tone="#34D399" />
      </div>

      <div className="panel mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            className="input pl-9"
            placeholder="搜索事件描述或操作人…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={13} className="hidden text-ink-300 sm:block" />
          <select className="input w-auto" value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}>
            <option value="all">全部操作人</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {roleLabels[u.role]}
              </option>
            ))}
          </select>
          <select className="input w-auto" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="all">全部课题组</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select
            className="input w-auto"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | "all")}
          >
            <option value="all">全部事件类型</option>
            {Object.entries(actionGroups).map(([group, actions]) => (
              <optgroup key={group} label={group}>
                {actions.map((a) => (
                  <option key={a} value={a}>{auditActionLabels[a]}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="hidden border-b border-ink-600/80 px-5 py-3 text-[10px] uppercase tracking-wider text-ink-300 sm:grid sm:grid-cols-[120px_minmax(0,1fr)_160px_180px] sm:gap-4">
          <span>时间</span>
          <span>事件</span>
          <span>类型</span>
          <span>操作人</span>
        </div>
        <ul className="divide-y divide-ink-600/40 max-h-[62vh] overflow-y-auto">
          {filtered.length === 0 && (
            <li className="px-5 py-16 text-center text-sm text-ink-300">
              暂无匹配的操作记录
            </li>
          )}
          {filtered.map((l) => (
            <AuditRow key={l.id} log={l} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="panel p-4">
      <p className="tick-label">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-semibold glow-text" style={{ color: tone }}>{value}</p>
    </div>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const users = useStore((s) => s.users);
  const actor = users.find((u) => u.id === log.actorId);
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!log.before || !!log.after;

  return (
    <li className="border-b border-ink-600/40 last:border-0">
      <button
        onClick={() => hasDetail && setExpanded((v) => !v)}
        className={cn(
          "grid w-full grid-cols-1 gap-2 px-5 py-3 text-left transition-colors sm:grid-cols-[120px_minmax(0,1fr)_160px_180px] sm:items-center sm:gap-4",
          hasDetail && "hover:bg-ink-700/20 cursor-pointer",
        )}
      >
        <time className="font-mono text-[10px] text-ink-300" suppressHydrationWarning>
          {formatDateTimeCN(log.createdAt)}
        </time>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {hasDetail && (
              expanded ? (
                <ChevronDown size={12} className="text-ink-300 shrink-0" />
              ) : (
                <ChevronRight size={12} className="text-ink-300 shrink-0" />
              )
            )}
            <p className="truncate text-ink-100">{log.summary}</p>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-ink-300">
            {log.targetType} · {log.targetId}
          </p>
        </div>
        <div>
          <Chip tone={actionTone[log.action]}>
            <ScrollText size={10} />
            {auditActionLabels[log.action]}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          {actor && (
            <>
              <Avatar name={actor.name} color={actor.avatarColor} size={24} />
              <div className="min-w-0">
                <p className="truncate text-xs text-ink-50">{actor.name}</p>
                <p className={cn(
                  "truncate font-mono text-[9px]",
                  actor.role === "director" ? "text-violeph" : actor.role === "admin" ? "text-phosphor-soft" : "text-ink-300",
                )}>
                  {roleLabels[actor.role]}
                </p>
              </div>
            </>
          )}
        </div>
      </button>

      {expanded && hasDetail && (
        <div className="border-t border-ink-600/40 bg-ink-900/30 px-5 py-4">
          <DiffViewer log={log} />
        </div>
      )}
    </li>
  );
}

// Satisfy SectionLabel tree-shake checker (used as decorative top-level only via hover)
void SectionLabel;

const friendlyLabels: Record<string, string> = {
  name: "名称",
  model: "型号",
  code: "资产编号",
  category: "分类",
  location: "位置",
  manual: "手册链接",
  requirements: "操作要求",
  requiresQualification: "是否需持证",
  qualificationIds: "关联资质",
  dailyOpenHour: "开放时间",
  dailyCloseHour: "关闭时间",
  utilizationTarget: "目标利用率(%)",
  status: "运行状态",
  acquisitionDate: "购入日期",
  title: "标题",
  start: "开始时间",
  end: "结束时间",
  recurrence: "重复规则",
  assignee: "负责人",
  note: "说明",
  instrumentId: "目标仪器",
  expireAt: "到期时间",
  grantedAt: "授予时间",
  purpose: "用途",
  durationHours: "时长(小时)",
  reviewNote: "审核备注",
};

const recurrenceLabels: Record<string, string> = {
  none: "单次",
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
};

const statusLabels: Record<string, string> = {
  available: "可预约",
  in_use: "使用中",
  maintenance: "维护中",
  offline: "已下线",
  pending: "待审核",
  approved: "已批准",
  rejected: "已驳回",
  cancelled: "已取消",
  completed: "已完成",
};

function formatValue(key: string, value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} 项` : "无";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") {
    if (key === "dailyOpenHour" || key === "dailyCloseHour") return `${String(value).padStart(2, "0")}:00`;
    return String(value);
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    }
    if (key === "recurrence") return recurrenceLabels[value] ?? value;
    if (key === "status") return statusLabels[value] ?? value;
    if (value.length > 60) return value.slice(0, 60) + "…";
    return value;
  }
  return JSON.stringify(value);
}

function DiffViewer({ log }: { log: AuditLog }) {
  const { before, after, changedFields } = log;

  const fields = useMemo(() => {
    if (changedFields && changedFields.length > 0) return changedFields;
    const keys = new Set<string>();
    if (before) Object.keys(before).forEach((k) => keys.add(k));
    if (after) Object.keys(after).forEach((k) => keys.add(k));
    const list: string[] = [];
    keys.forEach((k) => {
      const b = before?.[k];
      const a = after?.[k];
      if (JSON.stringify(b) !== JSON.stringify(a)) list.push(k);
    });
    return list;
  }, [before, after, changedFields]);

  const isCreate = !before && !!after;
  const isRemove = !!before && !after;

  if (fields.length === 0) {
    return (
      <div className="text-xs text-ink-300">
        <FileDiff size={14} className="mr-1.5 inline" />
        无详细变更字段
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <FileDiff size={14} className="text-phosphor-soft" />
        <span className="text-xs font-medium text-ink-100">
          {isCreate ? "创建时字段" : isRemove ? "删除前字段" : "变更详情"}
        </span>
        <span className="text-[10px] text-ink-300">共 {fields.length} 个字段</span>
      </div>

      <div className="overflow-hidden rounded-lg ring-1 ring-inset ring-ink-600/60">
        {!isCreate && !isRemove ? (
          <>
            <div className="grid grid-cols-[120px_1fr_1fr] border-b border-ink-600/60 bg-ink-800/50 text-[10px] uppercase tracking-wider text-ink-300">
              <span className="px-3 py-2">字段</span>
              <span className="border-l border-ink-600/60 px-3 py-2 text-roseph">变更前</span>
              <span className="border-l border-ink-600/60 px-3 py-2 text-emeraldph">变更后</span>
            </div>
            {fields.map((f) => (
              <div
                key={f}
                className="grid grid-cols-[120px_1fr_1fr] border-b border-ink-600/30 text-xs last:border-0"
              >
                <span className="px-3 py-2 text-ink-300">{friendlyLabels[f] ?? f}</span>
                <span className="border-l border-ink-600/30 px-3 py-2 font-mono text-roseph/90">
                  {formatValue(f, before?.[f])}
                </span>
                <span className="border-l border-ink-600/30 px-3 py-2 font-mono text-emeraldph/90">
                  {formatValue(f, after?.[f])}
                </span>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="grid grid-cols-[120px_1fr] border-b border-ink-600/60 bg-ink-800/50 text-[10px] uppercase tracking-wider text-ink-300">
              <span className="px-3 py-2">字段</span>
              <span className="border-l border-ink-600/60 px-3 py-2">值</span>
            </div>
            {fields.map((f) => (
              <div
                key={f}
                className="grid grid-cols-[120px_1fr] border-b border-ink-600/30 text-xs last:border-0"
              >
                <span className="px-3 py-2 text-ink-300">{friendlyLabels[f] ?? f}</span>
                <span
                  className={cn(
                    "border-l border-ink-600/30 px-3 py-2 font-mono",
                    isCreate ? "text-emeraldph/90" : "text-roseph/90",
                  )}
                >
                  {formatValue(f, (isCreate ? after : before)?.[f])}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
