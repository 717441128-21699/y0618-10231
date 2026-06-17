export type Role = "researcher" | "admin" | "director";

export interface User {
  id: string;
  name: string;
  role: Role;
  groupId: string;
  title: string;
  avatarColor: string;
}

export interface Group {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export type InstrumentStatus = "available" | "in_use" | "maintenance" | "offline";

export interface Instrument {
  id: string;
  name: string;
  model: string;
  code: string;
  category: string;
  location: string;
  manual: string;
  requirements: string;
  requiresQualification: boolean;
  qualificationIds: string[];
  status: InstrumentStatus;
  dailyOpenHour: number;
  dailyCloseHour: number;
  acquisitionDate: string;
  utilizationTarget: number;
}

export interface Qualification {
  id: string;
  name: string;
  abbr: string;
  description: string;
  validityMonths: number;
}

export type QualificationStatus = "valid" | "expiring" | "expired" | "none";

export interface QualificationRecord {
  id: string;
  userId: string;
  qualificationId: string;
  grantedAt: string;
  expireAt: string;
}

export type ReservationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed"
  | "in_progress";

export interface Reservation {
  id: string;
  instrumentId: string;
  userId: string;
  groupId: string;
  start: string;
  end: string;
  purpose: string;
  durationHours: number;
  status: ReservationStatus;
  reviewNote?: string;
  createdAt: string;
}

export type InstrumentHealth = "normal" | "minor_issue" | "fault";

export interface UsageLog {
  id: string;
  reservationId: string;
  instrumentId: string;
  userId: string;
  groupId: string;
  actualDurationHours: number;
  instrumentStatus: InstrumentHealth;
  anomaly: string;
  consumables: string;
  createdAt: string;
}

export type MaintenanceRecurrence = "none" | "daily" | "weekly" | "monthly";

export interface MaintenancePlan {
  id: string;
  instrumentId: string;
  title: string;
  start: string;
  end: string;
  recurrence: MaintenanceRecurrence;
  assignee: string;
  note: string;
  createdAt: string;
}

export interface NewReservationInput {
  instrumentId: string;
  start: string;
  end: string;
  purpose: string;
  durationHours: number;
}

export interface NewMaintenanceInput {
  instrumentId: string;
  title: string;
  start: string;
  end: string;
  recurrence: MaintenanceRecurrence;
  assignee: string;
  note: string;
}

export interface NewLogInput {
  reservationId: string;
  instrumentId: string;
  actualDurationHours: number;
  instrumentStatus: InstrumentHealth;
  anomaly: string;
  consumables: string;
}
