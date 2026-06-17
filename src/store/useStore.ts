import { create } from "zustand";
import type {
  Instrument,
  MaintenancePlan,
  NewLogInput,
  NewMaintenanceInput,
  NewReservationInput,
  QualificationRecord,
  Reservation,
  Role,
  UsageLog,
} from "@/types";
import { seedData } from "@/lib/mock";
import { nowISO, overlaps, parseISO, addDays, toISO } from "@/lib/date";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface LabState {
  groups: ReturnType<typeof seedData>["groups"];
  users: ReturnType<typeof seedData>["users"];
  qualifications: ReturnType<typeof seedData>["qualifications"];
  instruments: Instrument[];
  qualificationRecords: QualificationRecord[];
  reservations: Reservation[];
  maintenancePlans: MaintenancePlan[];
  usageLogs: UsageLog[];
  currentUserId: string;
  toast: string | null;

  setCurrentUser: (id: string) => void;
  showToast: (msg: string) => void;
  resetDemo: () => void;

  createReservation: (input: NewReservationInput) => string;
  approveReservation: (id: string, note?: string) => void;
  rejectReservation: (id: string, note: string) => void;
  cancelReservation: (id: string) => void;
  submitUsageLog: (input: NewLogInput) => void;
  addMaintenancePlan: (input: NewMaintenanceInput) => void;
  removeMaintenancePlan: (id: string) => void;
  approveQualification: (userId: string, qualificationId: string, validityMonths: number) => void;
}

const seed = seedData();

export const useStore = create<LabState>((set, get) => ({
  ...seed,
  currentUserId: "u1",
  toast: null,

  setCurrentUser: (id) => set({ currentUserId: id }),
  showToast: (msg) => {
    set({ toast: msg });
    window.setTimeout(() => set({ toast: null }), 2600);
  },
  resetDemo: () => set({ ...seedData(), currentUserId: "u1", toast: null }),

  createReservation: (input) => {
    const user = get().users.find((u) => u.id === get().currentUserId)!;
    const instrument = get().instruments.find((i) => i.id === input.instrumentId)!;
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
      status: needsReview ? (qualified ? "pending" : "pending") : "approved",
      createdAt: nowISO(),
    };
    set((s) => ({ reservations: [reservation, ...s.reservations] }));
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
    set((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === id ? { ...r, status: "approved", reviewNote: note ?? "已批准。" } : r,
      ),
    }));
    get().showToast("已批准预约，时段已锁定");
  },

  rejectReservation: (id, note) => {
    set((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === id ? { ...r, status: "rejected", reviewNote: note } : r,
      ),
    }));
    get().showToast("已驳回预约");
  },

  cancelReservation: (id) => {
    set((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === id ? { ...r, status: "cancelled" } : r,
      ),
    }));
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
    set((s) => ({
      usageLogs: [log, ...s.usageLogs],
      reservations: s.reservations.map((r) =>
        r.id === input.reservationId ? { ...r, status: "completed" } : r,
      ),
    }));
    get().showToast("使用日志已提交并归档");
  },

  addMaintenancePlan: (input) => {
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
    set((s) => ({ maintenancePlans: [...s.maintenancePlans, plan] }));
    set((s) => ({
      instruments: s.instruments.map((i) =>
        i.id === input.instrumentId && isInMaintenance([...s.maintenancePlans], i.id, nowISO(), nowISO())
          ? { ...i, status: "maintenance" }
          : i,
      ),
    }));
    get().showToast("维护计划已录入，对应时段已屏蔽预约");
  },

  removeMaintenancePlan: (id) => {
    set((s) => ({ maintenancePlans: s.maintenancePlans.filter((m) => m.id !== id) }));
    get().showToast("维护计划已删除");
  },

  approveQualification: (userId, qualificationId, validityMonths) => {
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
      const existing = s.qualificationRecords.filter(
        (q) => q.userId === userId && q.qualificationId === qualificationId,
      );
      const next = s.qualificationRecords.filter(
        (q) => !(q.userId === userId && q.qualificationId === qualificationId),
      );
      void existing;
      return { qualificationRecords: [record, ...next] };
    });
    get().showToast("资质认证已更新");
  },
}));

// ---- Helpers ----
export function isInMaintenance(
  plans: MaintenancePlan[],
  instrumentId: string,
  start: string,
  end: string,
): boolean {
  return plans.some((p) => {
    if (p.instrumentId !== instrumentId) return false;
    if (p.recurrence === "none") return overlaps(p.start, p.end, start, end);
    // expand recurrence occurrences within a 56-day window around the query
    const base = parseISO(p.start);
    const startDt = parseISO(start);
    const step = p.recurrence === "daily" ? 1 : p.recurrence === "weekly" ? 7 : 30;
    for (let i = -8; i <= 8; i++) {
      const occStart = addDays(base, step * i);
      const occEnd = addDays(parseISO(p.end), step * i);
      if (overlaps(toISO(occStart), toISO(occEnd), start, end)) return true;
      if (occStart > startDt && i > 0) break;
    }
    return false;
  });
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
