import type { InstrumentHealth, InstrumentStatus, ReservationStatus, Role } from "@/types";

export interface StatusMeta {
  label: string;
  dot: string;
  text: string;
  ring: string;
  bg: string;
}

export const reservationStatusMeta: Record<ReservationStatus, StatusMeta> = {
  pending: {
    label: "待审核",
    dot: "bg-amberph",
    text: "text-amberph",
    ring: "ring-amberph/30",
    bg: "bg-amberph/10",
  },
  approved: {
    label: "已批准",
    dot: "bg-skyph",
    text: "text-skyph",
    ring: "ring-skyph/30",
    bg: "bg-skyph/10",
  },
  in_progress: {
    label: "使用中",
    dot: "bg-phosphor",
    text: "text-phosphor-soft",
    ring: "ring-phosphor/30",
    bg: "bg-phosphor/10",
  },
  completed: {
    label: "已完成",
    dot: "bg-emeraldph",
    text: "text-emeraldph",
    ring: "ring-emeraldph/30",
    bg: "bg-emeraldph/10",
  },
  rejected: {
    label: "已驳回",
    dot: "bg-roseph",
    text: "text-roseph",
    ring: "ring-roseph/30",
    bg: "bg-roseph/10",
  },
  cancelled: {
    label: "已取消",
    dot: "bg-ink-300",
    text: "text-ink-200",
    ring: "ring-ink-500",
    bg: "bg-ink-700/40",
  },
};

export const instrumentStatusMeta: Record<InstrumentStatus, StatusMeta> = {
  available: {
    label: "空闲可用",
    dot: "bg-emeraldph",
    text: "text-emeraldph",
    ring: "ring-emeraldph/30",
    bg: "bg-emeraldph/10",
  },
  in_use: {
    label: "使用中",
    dot: "bg-phosphor",
    text: "text-phosphor-soft",
    ring: "ring-phosphor/30",
    bg: "bg-phosphor/10",
  },
  maintenance: {
    label: "维护中",
    dot: "bg-amberph",
    text: "text-amberph",
    ring: "ring-amberph/30",
    bg: "bg-amberph/10",
  },
  offline: {
    label: "离线",
    dot: "bg-ink-300",
    text: "text-ink-200",
    ring: "ring-ink-500",
    bg: "bg-ink-700/40",
  },
};

export const healthMeta: Record<InstrumentHealth, StatusMeta> = {
  normal: { label: "正常", dot: "bg-emeraldph", text: "text-emeraldph", ring: "ring-emeraldph/30", bg: "bg-emeraldph/10" },
  minor_issue: { label: "轻微异常", dot: "bg-amberph", text: "text-amberph", ring: "ring-amberph/30", bg: "bg-amberph/10" },
  fault: { label: "故障", dot: "bg-roseph", text: "text-roseph", ring: "ring-roseph/30", bg: "bg-roseph/10" },
};

export const roleMeta: Record<Role, { label: string; ring: string; text: string }> = {
  researcher: { label: "研究人员", ring: "ring-skyph/30", text: "text-skyph" },
  admin: { label: "仪器管理员", ring: "ring-phosphor/30", text: "text-phosphor-soft" },
  director: { label: "实验室主管", ring: "ring-violeph/30", text: "text-violeph" },
};

export const priorityMeta: Record<"high" | "medium" | "low", StatusMeta> = {
  high: { label: "高优先", dot: "bg-roseph", text: "text-roseph", ring: "ring-roseph/30", bg: "bg-roseph/10" },
  medium: { label: "中优先", dot: "bg-amberph", text: "text-amberph", ring: "ring-amberph/30", bg: "bg-amberph/10" },
  low: { label: "低优先", dot: "bg-emeraldph", text: "text-emeraldph", ring: "ring-emeraldph/30", bg: "bg-emeraldph/10" },
};
