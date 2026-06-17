import type { Group, Instrument, Reservation, UsageLog, MaintenancePlan } from "@/types";
import { addDays, dayKey, parseISO } from "./date";
import { isInMaintenance } from "@/store/useStore";

export function availableHoursPerDay(ins: Instrument): number {
  return Math.max(0, ins.dailyCloseHour - ins.dailyOpenHour);
}

export interface UtilizationResult {
  instrumentId: string;
  usedHours: number;
  capacityHours: number;
  rate: number;
  target: number;
}

export function instrumentUtilization(
  ins: Instrument,
  reservations: Reservation[],
  days: number,
): UtilizationResult {
  const from = addDays(new Date(), -days);
  const fromMs = from.getTime();
  const used = reservations
    .filter(
      (r) =>
        r.instrumentId === ins.id &&
        (r.status === "completed" || r.status === "approved" || r.status === "in_progress") &&
        parseISO(r.start).getTime() >= fromMs,
    )
    .reduce((sum, r) => sum + r.durationHours, 0);
  const capacity = availableHoursPerDay(ins) * days;
  const rate = capacity > 0 ? (used / capacity) * 100 : 0;
  return { instrumentId: ins.id, usedHours: round(used), capacityHours: capacity, rate: round(rate), target: ins.utilizationTarget };
}

export function groupUsageShare(
  groups: Group[],
  logs: UsageLog[],
  reservations: Reservation[],
  days: number,
): { group: Group; hours: number; share: number }[] {
  const from = addDays(new Date(), -days).getTime();
  const hoursByGroup = new Map<string, number>();
  groups.forEach((g) => hoursByGroup.set(g.id, 0));

  for (const log of logs) {
    if (parseISO(log.createdAt).getTime() >= from) {
      hoursByGroup.set(log.groupId, (hoursByGroup.get(log.groupId) ?? 0) + log.actualDurationHours);
    }
  }
  // include approved/in_progress upcoming reservations not yet logged
  for (const r of reservations) {
    if (
      (r.status === "approved" || r.status === "in_progress") &&
      parseISO(r.start).getTime() >= from
    ) {
      hoursByGroup.set(r.groupId, (hoursByGroup.get(r.groupId) ?? 0) + r.durationHours);
    }
  }

  const total = [...hoursByGroup.values()].reduce((a, b) => a + b, 0);
  return groups.map((g) => ({
    group: g,
    hours: round(hoursByGroup.get(g.id) ?? 0),
    share: total > 0 ? round(((hoursByGroup.get(g.id) ?? 0) / total) * 100) : 0,
  }));
}

export function peakHourDistribution(reservations: Reservation[], days: number): { hour: number; hours: number }[] {
  const from = addDays(new Date(), -days).getTime();
  const buckets = new Array(24).fill(0) as number[];
  for (const r of reservations) {
    const startMs = parseISO(r.start).getTime();
    if (startMs < from) continue;
    if (r.status === "rejected" || r.status === "cancelled") continue;
    const startHour = parseISO(r.start).getHours();
    buckets[startHour] += r.durationHours;
  }
  return buckets.map((hours, hour) => ({ hour, hours: round(hours) }));
}

export function reservationsForInstrument(
  reservations: Reservation[],
  instrumentId: string,
): Reservation[] {
  return reservations
    .filter((r) => r.instrumentId === instrumentId)
    .filter((r) => r.status !== "cancelled" && r.status !== "rejected");
}

export function maintenanceStatusForDay(
  plans: MaintenancePlan[],
  instrumentId: string,
  day: Date,
): MaintenancePlan | null {
  const dayStart = dayKey(day) + "T00:00";
  const dayEnd = dayKey(day) + "T23:59";
  const found = plans.find((p) => p.instrumentId === instrumentId && isInMaintenance([p], instrumentId, dayStart, dayEnd));
  return found ?? null;
}

export function round(n: number, p = 1): number {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}

export function procurementSuggestions(
  instruments: Instrument[],
  reservations: Reservation[],
  days: number,
): { instrument: Instrument; rate: number; target: number; overload: number; priority: "high" | "medium" | "low" }[] {
  return instruments
    .map((ins) => {
      const u = instrumentUtilization(ins, reservations, days);
      const overload = Math.max(0, round(u.rate - u.target));
      const priority: "high" | "medium" | "low" =
        overload >= 20 ? "high" : overload >= 8 ? "medium" : "low";
      return { instrument: ins, rate: u.rate, target: u.target, overload, priority };
    })
    .sort((a, b) => b.overload - a.overload);
}
