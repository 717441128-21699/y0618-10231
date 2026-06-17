import { create } from "zustand";
import type {
  AuditAction,
  AuditLog,
  Instrument,
  InstrumentStatus,
  MaintenancePlan,
  NewInstrumentInput,
  NewLogInput,
  NewMaintenanceInput,
  NewReservationInput,
  QualificationRecord,
  Reservation,
  Role,
  UpdateInstrumentInput,
  UpdateMaintenanceInput,
  UsageLog,
} from "@/types";
import { seedData } from "@/lib/mock";
import { nowISO, overlaps, parseISO, addDays, toISO, dayKey } from "@/lib/date";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const STORAGE_KEY = "labsync:v1";
const PERSIST_FIELDS = [
  "instruments",
  "qualificationRecords",
  "reservations",
  "maintenancePlans",
  "usageLogs",
  "auditLogs",
] as const;
type PersistedField = (typeof PERSIST_FIELDS)[number];

type SeedShape = ReturnType<typeof seedData>;

interface LabState {
  groups: SeedShape["groups"];
  users: SeedShape["users"];
  qualifications: SeedShape["qualifications"];
  instruments: Instrument[];
  qualificationRecords: QualificationRecord[];
  reservations: Reservation[];
  maintenancePlans: MaintenancePlan[];
  usageLogs: UsageLog[];
  auditLogs: AuditLog[];
  currentUserId: string;
  toast: string | null;

  setCurrentUser: (id: string) => void;
  showToast: (msg: string) => void;
  resetDemo: () => void;

  createInstrument: (input: NewInstrumentInput) => string;
  updateInstrument: (id: string, patch: UpdateInstrumentInput) => void;
  offlineInstrument: (id: string) => void;

  createReservation: (input: NewReservationInput) => string;
  approveReservation: (id: string, note?: string) => void;
  rejectReservation: (id: string, note: string) => void;
  cancelReservation: (id: string) => void;
  submitUsageLog: (input: NewLogInput) => void;

  addMaintenancePlan: (input: NewMaintenanceInput) => string;
  updateMaintenancePlan: (id: string, patch: UpdateMaintenanceInput) => void;
  removeMaintenancePlan: (id: string) => void;

  approveQualification: (userId: string, qualificationId: string, validityMonths: number) => void;

  /** internal, don't call outside the store */
  _appendAudit: (entry: Omit<AuditLog, "id" | "createdAt" | "actorId"> & { actorId?: string; before?: Record<string, unknown>; after?: Record<string, unknown>; changedFields?: string[] }) => void;
}

function loadPersisted(seed: SeedShape): Pick<LabState, PersistedField> {
  if (typeof window === "undefined") {
    return {
      instruments: seed.instruments,
      qualificationRecords: seed.qualificationRecords,
      reservations: seed.reservations,
      maintenancePlans: seed.maintenancePlans,
      usageLogs: seed.usageLogs,
      auditLogs: [],
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        instruments: seed.instruments,
        qualificationRecords: seed.qualificationRecords,
        reservations: seed.reservations,
        maintenancePlans: seed.maintenancePlans,
        usageLogs: seed.usageLogs,
        auditLogs: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<Record<PersistedField, unknown>>;
    return {
      instruments: (parsed.instruments as Instrument[]) ?? seed.instruments,
      qualificationRecords: (parsed.qualificationRecords as QualificationRecord[]) ?? seed.qualificationRecords,
      reservations: (parsed.reservations as Reservation[]) ?? seed.reservations,
      maintenancePlans: (parsed.maintenancePlans as MaintenancePlan[]) ?? seed.maintenancePlans,
      usageLogs: (parsed.usageLogs as UsageLog[]) ?? seed.usageLogs,
      auditLogs: (parsed.auditLogs as AuditLog[]) ?? [],
    };
  } catch {
    return {
      instruments: seed.instruments,
      qualificationRecords: seed.qualificationRecords,
      reservations: seed.reservations,
      maintenancePlans: seed.maintenancePlans,
      usageLogs: seed.usageLogs,
      auditLogs: [],
    };
  }
}

function persist(state: Partial<Pick<LabState, PersistedField>>) {
  if (typeof window === "undefined") return;
  try {
    const obj: Partial<Pick<LabState, PersistedField>> = {};
    PERSIST_FIELDS.forEach((k) => {
      if (k in state) (obj as Record<string, unknown>)[k] = (state as Record<string, unknown>)[k];
    });
    // read-write to avoid wiping untouched fields across subscriptions
    const prev = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
    })();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...obj }));
  } catch {
    /* ignore quota errors */
  }
}

const seed = seedData();

export const useStore = create<LabState>((set, get) => ({
  ...seed,
  ...loadPersisted(seed),
  currentUserId: "u1",
  toast: null,

  setCurrentUser: (id) => set({ currentUserId: id }),
  showToast: (msg) => {
    set({ toast: msg });
    window.setTimeout(() => set({ toast: null }), 2600);
  },
  resetDemo: () => {
    const actor = get().users.find((u) => u.id === get().currentUserId);
    const log: AuditLog = {
      id: uid("aud"),
      action: "system.reset",
      actorId: get().currentUserId,
      targetType: "system",
      targetId: "demo",
      summary: actor ? `${actor.name} 重置为演示数据` : "重置为演示数据",
      createdAt: nowISO(),
    };
    const fresh: Pick<LabState, PersistedField> = {
      instruments: seed.instruments,
      qualificationRecords: seed.qualificationRecords,
      reservations: seed.reservations,
      maintenancePlans: seed.maintenancePlans,
      usageLogs: seed.usageLogs,
      auditLogs: [log],
    };
    set({ ...fresh, currentUserId: "u1", toast: null });
    persist(fresh);
    get().showToast("已重置为演示数据");
  },

  // ---- Instruments ----
  createInstrument: (input) => {
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    const status: InstrumentStatus = "available";
    const ins: Instrument = { id: uid("ins"), status, ...input };
    set((s) => {
      const next = { instruments: [ins, ...s.instruments] };
      persist(next);
      return next;
    });
    const afterRecord = { ...ins } as unknown as Record<string, unknown>;
    get()._appendAudit({
      action: "instrument.create",
      targetType: "instrument",
      targetId: ins.id,
      summary: `${actor.name} 新增仪器「${ins.name} ${ins.model}」`,
      after: afterRecord,
      changedFields: Object.keys(input),
    });
    get().showToast("仪器信息已录入");
    return ins.id;
  },

  updateInstrument: (id, patch) => {
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    const prev = get().instruments.find((i) => i.id === id);
    if (!prev) return;
    const beforeRecord = { ...prev } as unknown as Record<string, unknown>;
    set((s) => {
      const next = {
        instruments: s.instruments.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      };
      persist(next);
      return next;
    });
    const after = get().instruments.find((i) => i.id === id);
    if (prev && after) {
      const diff = fieldDiff(
        prev as unknown as Record<string, unknown>,
        after as unknown as Record<string, unknown>,
        patch as Record<string, unknown>,
      );
      const afterRecord = { ...after } as unknown as Record<string, unknown>;
      get()._appendAudit({
        action: "instrument.update",
        targetType: "instrument",
        targetId: id,
        summary: `${actor.name} 更新仪器「${after.name}」· ${diff.summary}`,
        before: beforeRecord,
        after: afterRecord,
        changedFields: diff.changedFields,
      });
    }
    get().showToast("仪器信息已更新");
  },

  offlineInstrument: (id) => {
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    const prev = get().instruments.find((i) => i.id === id);
    const beforeRecord = prev ? { ...prev } as unknown as Record<string, unknown> : undefined;
    set((s) => {
      const next = {
        instruments: s.instruments.map((i) => (i.id === id ? { ...i, status: "offline" as const } : i)),
      };
      persist(next);
      return next;
    });
    const ins = get().instruments.find((i) => i.id === id);
    if (ins) {
      const afterRecord = { ...ins } as unknown as Record<string, unknown>;
      get()._appendAudit({
        action: "instrument.offline",
        targetType: "instrument",
        targetId: id,
        summary: `${actor.name} 下线仪器「${ins.name}」`,
        before: beforeRecord,
        after: afterRecord,
        changedFields: ["status"],
      });
    }
    get().showToast("仪器已下线，预约被屏蔽");
  },

  // ---- Reservations ----
  createReservation: (input) => {
    const user = get().users.find((u) => u.id === get().currentUserId)!;
    const instrument = get().instruments.find((i) => i.id === input.instrumentId);
    if (!instrument) {
      get().showToast("仪器不存在");
      return "";
    }
    if (instrument.status === "offline") {
      get().showToast("该仪器已下线，无法预约");
      return "";
    }
    // open-hour validation for each day covered
    const openViolation = violatesOpenHours(instrument, input.start, input.end);
    if (openViolation) {
      get().showToast(openViolation);
      return "";
    }
    const conflicts = get().reservations.some(
      (r) =>
        r.instrumentId === input.instrumentId &&
        (r.status === "approved" || r.status === "pending" || r.status === "in_progress") &&
        overlaps(r.start, r.end, input.start, input.end),
    );
    const maintConflict = isInMaintenance(get().maintenancePlans, input.instrumentId, input.start, input.end);
    if (conflicts) {
      get().showToast("该时段已有预约冲突，请选择其他时段");
      return "";
    }
    if (maintConflict) {
      get().showToast("该时段处于维护屏蔽窗口，无法预约");
      return "";
    }
    const needsReview = instrument.requiresQualification;
    const qualified = !needsReview || isUserQualified(
      get().qualificationRecords,
      user.id,
      instrument.qualificationIds,
    );
    const reservation: Reservation = {
      id: uid("r"),
      instrumentId: input.instrumentId,
      userId: user.id,
      groupId: user.groupId,
      start: input.start,
      end: input.end,
      purpose: input.purpose,
      durationHours: input.durationHours,
      status: needsReview ? "pending" : "approved",
      createdAt: nowISO(),
    };
    set((s) => {
      const next = { reservations: [reservation, ...s.reservations] };
      persist(next);
      return next;
    });
    get()._appendAudit({
      action: "reservation.create",
      targetType: "reservation",
      targetId: reservation.id,
      summary: `${user.name} 申请预约「${instrument.name}」${formatRange(input.start, input.end)}，用途：${input.purpose.slice(0, 16)}`,
    });
    get().showToast(
      needsReview
        ? qualified
          ? "预约已提交，等待管理员审核"
          : "预约已提交（提示：您尚未取得所需资质，请尽快认证）"
        : "预约成功，时段已锁定",
    );
    return reservation.id;
  },

  approveReservation: (id, note) => {
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    set((s) => {
      const next = {
        reservations: s.reservations.map((r) =>
          r.id === id ? { ...r, status: "approved" as const, reviewNote: note ?? "已批准。" } : r,
        ),
      };
      persist(next);
      return next;
    });
    const r = get().reservations.find((x) => x.id === id);
    const ins = get().instruments.find((i) => i.id === r?.instrumentId);
    if (r && ins) {
      const applicant = get().users.find((u) => u.id === r.userId);
      get()._appendAudit({
        action: "reservation.approve",
        targetType: "reservation",
        targetId: id,
        summary: `${actor.name} 批准了 ${applicant?.name ?? "用户"} 关于「${ins.name}」${formatRange(r.start, r.end)} 的预约`,
      });
    }
    get().showToast("已批准预约，时段已锁定");
  },

  rejectReservation: (id, note) => {
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    set((s) => {
      const next = {
        reservations: s.reservations.map((r) =>
          r.id === id ? { ...r, status: "rejected" as const, reviewNote: note } : r,
        ),
      };
      persist(next);
      return next;
    });
    const r = get().reservations.find((x) => x.id === id);
    const ins = get().instruments.find((i) => i.id === r?.instrumentId);
    if (r && ins) {
      const applicant = get().users.find((u) => u.id === r.userId);
      get()._appendAudit({
        action: "reservation.reject",
        targetType: "reservation",
        targetId: id,
        summary: `${actor.name} 驳回了 ${applicant?.name ?? "用户"} 关于「${ins.name}」${formatRange(r.start, r.end)} 的预约：${note.slice(0, 20)}`,
      });
    }
    get().showToast("已驳回预约");
  },

  cancelReservation: (id) => {
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    set((s) => {
      const next = {
        reservations: s.reservations.map((r) =>
          r.id === id ? { ...r, status: "cancelled" as const } : r,
        ),
      };
      persist(next);
      return next;
    });
    const r = get().reservations.find((x) => x.id === id);
    const ins = get().instruments.find((i) => i.id === r?.instrumentId);
    if (r && ins) {
      get()._appendAudit({
        action: "reservation.cancel",
        targetType: "reservation",
        targetId: id,
        summary: `${actor.name} 取消了「${ins.name}」${formatRange(r.start, r.end)} 的预约`,
      });
    }
    get().showToast("预约已取消");
  },

  submitUsageLog: (input) => {
    const user = get().users.find((u) => u.id === get().currentUserId)!;
    const reservation = get().reservations.find((r) => r.id === input.reservationId);
    if (!reservation) return;
    const log: UsageLog = {
      id: uid("log"),
      reservationId: input.reservationId,
      instrumentId: input.instrumentId,
      userId: user.id,
      groupId: user.groupId,
      actualDurationHours: input.actualDurationHours,
      instrumentStatus: input.instrumentStatus,
      anomaly: input.anomaly,
      consumables: input.consumables,
      createdAt: nowISO(),
    };
    set((s) => {
      const next = {
        usageLogs: [log, ...s.usageLogs],
        reservations: s.reservations.map((r) =>
          r.id === input.reservationId ? { ...r, status: "completed" as const } : r,
        ),
      };
      persist(next);
      return next;
    });
    const ins = get().instruments.find((i) => i.id === input.instrumentId);
    get()._appendAudit({
      action: "reservation.complete",
      targetType: "reservation",
      targetId: input.reservationId,
      summary: `${user.name} 填写「${ins?.name ?? "仪器"}」使用日志，实际 ${input.actualDurationHours}h，状态 ${healthLabel(input.instrumentStatus)}`,
    });
    get().showToast("使用日志已提交并归档");
  },

  // ---- Maintenance ----
  addMaintenancePlan: (input) => {
    const errors = validateMaintenanceInput(input, false);
    if (errors.length > 0) {
      get().showToast(errors[0]);
      return "";
    }
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    const plan: MaintenancePlan = {
      id: uid("m"),
      instrumentId: input.instrumentId,
      title: input.title,
      start: input.start,
      end: input.end,
      recurrence: input.recurrence,
      assignee: input.assignee,
      note: input.note,
      createdAt: nowISO(),
    };
    set((s) => {
      const next = { maintenancePlans: [...s.maintenancePlans, plan] };
      persist(next);
      return next;
    });
    set((s) => {
      const instruments = s.instruments.map((i) =>
        i.id === input.instrumentId && isInMaintenance([...s.maintenancePlans], i.id, nowISO(), nowISO())
          ? { ...i, status: "maintenance" as const }
          : i,
      );
      const next = { instruments };
      persist(next);
      return next;
    });
    const ins = get().instruments.find((i) => i.id === input.instrumentId);
    const afterRecord = { ...plan } as unknown as Record<string, unknown>;
    get()._appendAudit({
      action: "maintenance.create",
      targetType: "maintenance",
      targetId: plan.id,
      summary: `${actor.name} 创建「${ins?.name ?? "仪器"}」维护计划：${plan.title}，${formatRange(plan.start, plan.end)}${plan.recurrence !== "none" ? ` (${recurrenceLabel(plan.recurrence)})` : ""}`,
      after: afterRecord,
      changedFields: Object.keys(input),
    });
    get().showToast("维护计划已录入，对应时段已屏蔽预约");
    return plan.id;
  },

  updateMaintenancePlan: (id, patch) => {
    const prev = get().maintenancePlans.find((p) => p.id === id);
    if (!prev) return;
    const merged = { ...prev, ...patch } as unknown as NewMaintenanceInput;
    const errors = validateMaintenanceInput(merged, true);
    if (errors.length > 0) {
      get().showToast(errors[0]);
      return;
    }
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    const prevRecord = { ...prev } as unknown as Record<string, unknown>;
    set((s) => {
      const next = {
        maintenancePlans: s.maintenancePlans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      };
      persist(next);
      return next;
    });
    const plan = get().maintenancePlans.find((p) => p.id === id);
    const ins = plan ? get().instruments.find((i) => i.id === plan.instrumentId) : null;
    if (plan && ins) {
      const afterRecord = { ...plan } as unknown as Record<string, unknown>;
      const diff = fieldDiff(prevRecord, afterRecord, patch as unknown as Record<string, unknown>);
      get()._appendAudit({
        action: "maintenance.update",
        targetType: "maintenance",
        targetId: id,
        summary: `${actor.name} 更新「${ins.name}」维护计划「${plan.title}」· ${diff.summary}`,
        before: prevRecord,
        after: afterRecord,
        changedFields: diff.changedFields,
      });
    }
    get().showToast("维护计划已更新");
  },

  removeMaintenancePlan: (id) => {
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    const plan = get().maintenancePlans.find((p) => p.id === id);
    const ins = plan ? get().instruments.find((i) => i.id === plan.instrumentId) : null;
    const beforeRecord = plan ? { ...plan } as unknown as Record<string, unknown> : undefined;
    set((s) => {
      const next = { maintenancePlans: s.maintenancePlans.filter((m) => m.id !== id) };
      persist(next);
      return next;
    });
    if (plan && ins) {
      get()._appendAudit({
        action: "maintenance.remove",
        targetType: "maintenance",
        targetId: id,
        summary: `${actor.name} 删除「${ins.name}」维护计划「${plan.title}」`,
        before: beforeRecord,
      });
    }
    get().showToast("维护计划已删除");
  },

  // ---- Qualifications ----
  approveQualification: (userId, qualificationId, validityMonths) => {
    const actor = get().users.find((u) => u.id === get().currentUserId)!;
    const prevRecord = get().qualificationRecords.find(
      (q) => q.userId === userId && q.qualificationId === qualificationId,
    );
    const beforeRecord = prevRecord ? { ...prevRecord } as unknown as Record<string, unknown> : undefined;
    const granted = new Date();
    const expire = addDays(granted, validityMonths * 30);
    const record: QualificationRecord = {
      id: uid("qr"),
      userId,
      qualificationId,
      grantedAt: toISO(granted),
      expireAt: toISO(expire),
    };
    set((s) => {
      const next = {
        qualificationRecords: [
          record,
          ...s.qualificationRecords.filter(
            (q) => !(q.userId === userId && q.qualificationId === qualificationId),
          ),
        ],
      };
      persist(next);
      return next;
    });
    const target = get().users.find((u) => u.id === userId);
    const qual = get().qualifications.find((q) => q.id === qualificationId);
    if (target && qual) {
      const afterRecord = { ...record } as unknown as Record<string, unknown>;
      get()._appendAudit({
        action: "qualification.grant",
        targetType: "qualification",
        targetId: `${userId}-${qualificationId}`,
        summary: `${actor.name} 为 ${target.name} 授予/续期资质「${qual.name}」(${qual.abbr})，有效期 ${validityMonths} 月`,
        before: beforeRecord,
        after: afterRecord,
        changedFields: ["grantedAt", "expireAt"],
      });
    }
    get().showToast("资质认证已更新");
  },

  // ---- private helper on the instance ----
  _appendAudit: (entry) => {
    const actorId = entry.actorId ?? get().currentUserId;
    const log: AuditLog = {
      id: uid("aud"),
      actorId,
      createdAt: nowISO(),
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary,
      before: entry.before,
      after: entry.after,
      changedFields: entry.changedFields,
    };
    set((s) => {
      const next = { auditLogs: [log, ...s.auditLogs].slice(0, 500) };
      persist(next);
      return next;
    });
  },
}));

// ---- Helpers ----

function violatesOpenHours(
  instrument: Pick<Instrument, "dailyOpenHour" | "dailyCloseHour" | "name">,
  startISO: string,
  endISO: string,
): string | null {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (end <= start) return "预约时长无效";
  // walk every day covered and check hour bounds
  const d0 = new Date(start);
  d0.setHours(0, 0, 0, 0);
  const dN = new Date(end);
  dN.setHours(0, 0, 0, 0);
  for (let cursor = new Date(d0); cursor <= dN; cursor = addDays(cursor, 1)) {
    const dayStart = new Date(cursor);
    dayStart.setHours(instrument.dailyOpenHour, 0, 0, 0);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(instrument.dailyCloseHour, 0, 0, 0);
    const overlapS = start > dayStart ? start : dayStart;
    const overlapE = end < dayEnd ? end : dayEnd;
    // if any part of the reservation falls on this day, require it to be within [dayStart, dayEnd]
    if (overlapS < overlapE) {
      const sKey = dayKey(cursor);
      if (start < dayStart && dayKey(start) === sKey) {
        return `${instrument.name} 开放时间为 ${instrument.dailyOpenHour}:00 – ${instrument.dailyCloseHour}:00，起始时段过早`;
      }
      if (end > dayEnd && dayKey(end) === sKey) {
        return `${instrument.name} 每日 ${instrument.dailyCloseHour}:00 关闭，请勿跨到关门时段`;
      }
    }
  }
  return null;
}

function formatRange(start: string, end: string): string {
  const s = parseISO(start);
  const e = parseISO(end);
  const pad = (n: number) => String(n).padStart(2, "0");
  const sameDay = dayKey(s) === dayKey(e);
  const sStr = `${s.getMonth() + 1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}`;
  const eStr = sameDay
    ? `${pad(e.getHours())}:${pad(e.getMinutes())}`
    : `${e.getMonth() + 1}/${e.getDate()} ${pad(e.getHours())}:${pad(e.getMinutes())}`;
  return `${sStr}–${eStr}`;
}

function fieldDiff(prev: Record<string, unknown>, after: Record<string, unknown>, patch: Record<string, unknown>): { changedFields: string[]; summary: string } {
  const touched = Object.keys(patch);
  const friendly: Record<string, string> = {
    name: "名称", model: "型号", code: "资产编号", category: "分类", location: "位置",
    manual: "手册", requirements: "操作要求", requiresQualification: "资质要求",
    qualificationIds: "关联资质", dailyOpenHour: "开放时间", dailyCloseHour: "关闭时间",
    utilizationTarget: "目标利用率", status: "运行状态", acquisitionDate: "购入日期",
    title: "标题", start: "开始时间", end: "结束时间", recurrence: "重复规则",
    assignee: "负责人", note: "说明", instrumentId: "目标仪器",
    expireAt: "到期时间", grantedAt: "授予时间",
  };
  const changed: string[] = [];
  const parts: string[] = [];
  touched.forEach((k) => {
    const before = JSON.stringify(prev[k]);
    const afterStr = JSON.stringify(after[k]);
    if (before !== afterStr) {
      changed.push(k);
      parts.push(friendly[k] ?? k);
    }
  });
  return {
    changedFields: changed,
    summary: parts.length ? `修改 ${parts.join("、")}` : "无字段变更",
  };
}

function recurrenceLabel(r: "none" | "daily" | "weekly" | "monthly"): string {
  return ({ none: "单次", daily: "每日", weekly: "每周", monthly: "每月" } as const)[r];
}

function healthLabel(h: "normal" | "minor_issue" | "fault"): string {
  return ({ normal: "正常", minor_issue: "轻微异常", fault: "故障报修" } as const)[h];
}

function validateMaintenanceInput(input: NewMaintenanceInput | UpdateMaintenanceInput, isEdit = false): string[] {
  const errors: string[] = [];
  if (!isEdit) {
    if (!input.title?.trim()) errors.push("请填写维护标题");
    if (!input.instrumentId) errors.push("请选择目标仪器");
  }
  if (input.title !== undefined && !input.title.trim()) errors.push("维护标题不能为空");
  if (input.assignee !== undefined && !input.assignee.trim()) errors.push("请指定维护负责人");
  if (input.start !== undefined || input.end !== undefined) {
    const s = input.start ? parseISO(input.start) : null;
    const e = input.end ? parseISO(input.end) : null;
    if (s && e && e <= s) {
      errors.push("结束时间必须晚于开始时间");
    }
    if (s && e) {
      const durHours = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
      if (durHours < 0.5) errors.push("维护窗口至少需要 30 分钟");
      if (durHours > 24) errors.push("单次维护窗口不能超过 24 小时");
    }
  }
  return errors;
}

/** expand maintenance occurrences for an instrument within [start, end], returns individual {start,end,plan} blocks */
export function maintenanceOccurrences(
  plans: MaintenancePlan[],
  instrumentId: string,
  rangeStart: string,
  rangeEnd: string,
): { start: string; end: string; plan: MaintenancePlan }[] {
  const out: { start: string; end: string; plan: MaintenancePlan }[] = [];
  const rs = parseISO(rangeStart).getTime();
  const re = parseISO(rangeEnd).getTime();
  plans.forEach((p) => {
    if (p.instrumentId !== instrumentId) return;
    if (p.recurrence === "none") {
      if (overlaps(p.start, p.end, rangeStart, rangeEnd)) out.push({ start: p.start, end: p.end, plan: p });
      return;
    }
    const base = parseISO(p.start);
    const baseEnd = parseISO(p.end);
    const spanMs = baseEnd.getTime() - base.getTime();
    const step = p.recurrence === "daily" ? 1 : p.recurrence === "weekly" ? 7 : 30;
    // expand backward and forward 120 occurrences (covers ~10 years monthly)
    for (let i = -120; i <= 120; i++) {
      const occS = addDays(base, step * i);
      const occST = occS.getTime();
      const occET = occST + spanMs;
      if (occST > re) break;
      if (occET < rs) continue;
      out.push({ start: toISO(occS), end: toISO(new Date(occET)), plan: p });
    }
  });
  return out;
}

export function isInMaintenance(
  plans: MaintenancePlan[],
  instrumentId: string,
  start: string,
  end: string,
): boolean {
  return maintenanceOccurrences(plans, instrumentId, start, end).length > 0;
}

export function isUserQualified(
  records: QualificationRecord[],
  userId: string,
  qualificationIds: string[],
): boolean {
  if (qualificationIds.length === 0) return true;
  const now = Date.now();
  return qualificationIds.every((qid) =>
    records.some(
      (r) =>
        r.userId === userId &&
        r.qualificationId === qid &&
        parseISO(r.expireAt).getTime() >= now,
    ),
  );
}

export const roleLabels: Record<Role, string> = {
  researcher: "研究人员",
  admin: "仪器管理员",
  director: "实验室主管",
};

export const auditActionLabels: Record<AuditAction, string> = {
  "reservation.approve": "批准预约",
  "reservation.reject": "驳回预约",
  "reservation.cancel": "取消预约",
  "reservation.create": "提交预约",
  "reservation.complete": "填写日志",
  "maintenance.create": "新建维护",
  "maintenance.update": "更新维护",
  "maintenance.remove": "删除维护",
  "qualification.grant": "资质认证",
  "instrument.create": "新增仪器",
  "instrument.update": "更新仪器",
  "instrument.offline": "下线仪器",
  "system.reset": "重置数据",
};
