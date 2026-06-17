import type {
  Group,
  Instrument,
  MaintenancePlan,
  Qualification,
  QualificationRecord,
  Reservation,
  UsageLog,
  User,
} from "@/types";
import { addDays, addHours, parseISO, startOfWeek, toISO } from "./date";

const today = new Date();

export const groups: Group[] = [
  { id: "g1", name: "纳米材料与器件课题组", shortName: "NANO", color: "#2DD4BF" },
  { id: "g2", name: "生物医学影像课题组", shortName: "BIO", color: "#A78BFA" },
  { id: "g3", name: "计算化学与催化课题组", shortName: "CAT", color: "#F59E0B" },
];

export const users: User[] = [
  { id: "u1", name: "陈思远", role: "director", groupId: "g1", title: "实验室主管", avatarColor: "#2DD4BF" },
  { id: "u2", name: "林晓彤", role: "admin", groupId: "g1", title: "仪器管理员", avatarColor: "#38BDF8" },
  { id: "u3", name: "王浩然", role: "researcher", groupId: "g1", title: "博士后研究员", avatarColor: "#34D399" },
  { id: "u4", name: "赵敏", role: "researcher", groupId: "g2", title: "副研究员", avatarColor: "#A78BFA" },
  { id: "u5", name: "刘伟", role: "researcher", groupId: "g2", title: "助理研究员", avatarColor: "#FB7185" },
  { id: "u6", name: "周婷", role: "researcher", groupId: "g3", title: "博士研究生", avatarColor: "#F59E0B" },
  { id: "u7", name: "孙磊", role: "researcher", groupId: "g3", title: "博士研究生", avatarColor: "#FBBF24" },
  { id: "u8", name: "吴佳琪", role: "admin", groupId: "g2", title: "仪器管理员", avatarColor: "#5EEAD4" },
];

export const qualifications: Qualification[] = [
  { id: "q1", name: "扫描电镜操作资质", abbr: "SEM", description: "场发射电镜常规成像与能谱操作认证", validityMonths: 24 },
  { id: "q2", name: "流式细胞分选资质", abbr: "FACS", description: "流式细胞分析与分选无菌操作认证", validityMonths: 12 },
  { id: "q3", name: "共聚焦显微镜资质", abbr: "CONF", description: "激光共聚焦多通道荧光成像认证", validityMonths: 18 },
  { id: "q4", name: "透射电镜操作资质", abbr: "TEM", description: "高分辨透射电镜样品与成像认证", validityMonths: 24 },
  { id: "q5", name: "高压反应釜资质", abbr: "REAC", description: "高压加氢反应釜安全操作认证", validityMonths: 12 },
];

export const instruments: Instrument[] = [
  {
    id: "ins1",
    name: "场发射扫描电子显微镜",
    model: "Hitachi SU8100",
    code: "SEM-01",
    category: "显微成像",
    location: "实验楼 A · 305 室",
    manual: "SEM-8100 操作手册 v3.2.pdf",
    requirements: "需经培训并取得 SEM 资质；样品需喷金/喷碳处理；高真空模式需提前 30min 预抽。",
    requiresQualification: true,
    qualificationIds: ["q1"],
    status: "in_use",
    dailyOpenHour: 8,
    dailyCloseHour: 22,
    acquisitionDate: "2022-03-15",
    utilizationTarget: 70,
  },
  {
    id: "ins2",
    name: "流式细胞分选仪",
    model: "BD FACSAria III",
    code: "FACS-02",
    category: "细胞分析",
    location: "实验楼 B · 210 室",
    manual: "FACSAria III 用户指南.pdf",
    requirements: "持 FACS 资质；生物安全二级样品需在 BSC 内制备；分选前后执行清洗程序。",
    requiresQualification: true,
    qualificationIds: ["q2"],
    status: "available",
    dailyOpenHour: 9,
    dailyCloseHour: 21,
    acquisitionDate: "2021-09-01",
    utilizationTarget: 65,
  },
  {
    id: "ins3",
    name: "激光共聚焦显微镜",
    model: "Leica TCS SP8",
    code: "CONF-03",
    category: "显微成像",
    location: "实验楼 A · 308 室",
    manual: "Leica SP8 操作规程.pdf",
    requirements: "持 CONF 资质；激光器开启顺序严格按手册；使用后关闭汞灯。",
    requiresQualification: true,
    qualificationIds: ["q3"],
    status: "available",
    dailyOpenHour: 8,
    dailyCloseHour: 22,
    acquisitionDate: "2023-01-20",
    utilizationTarget: 72,
  },
  {
    id: "ins4",
    name: "高分辨透射电子显微镜",
    model: "Talos F200X",
    code: "TEM-04",
    category: "显微成像",
    location: "实验楼 A · 401 室",
    manual: "Talos F200X 操作手册.pdf",
    requirements: "持 TEM 资质；样品杆装卸需双人确认；液氮补充由管理员执行。",
    requiresQualification: true,
    qualificationIds: ["q4"],
    status: "maintenance",
    dailyOpenHour: 9,
    dailyCloseHour: 18,
    acquisitionDate: "2020-06-10",
    utilizationTarget: 60,
  },
  {
    id: "ins5",
    name: "高效液相色谱仪",
    model: "Agilent 1260 Infinity II",
    code: "HPLC-05",
    category: "分离分析",
    location: "实验楼 C · 112 室",
    manual: "Agilent 1260 快速指南.pdf",
    requirements: "使用前平衡色谱柱 30min；样品需 0.22μm 过滤；流动相现配。",
    requiresQualification: false,
    qualificationIds: [],
    status: "available",
    dailyOpenHour: 8,
    dailyCloseHour: 22,
    acquisitionDate: "2024-02-28",
    utilizationTarget: 55,
  },
  {
    id: "ins6",
    name: "紫外可见分光光度计",
    model: "Shimadzu UV-3600 Plus",
    code: "UV-06",
    category: "光谱分析",
    location: "实验楼 C · 115 室",
    manual: "UV-3600 操作手册.pdf",
    requirements: "比色皿使用后清洗归位；避免强光照射检测器。",
    requiresQualification: false,
    qualificationIds: [],
    status: "available",
    dailyOpenHour: 8,
    dailyCloseHour: 22,
    acquisitionDate: "2023-11-05",
    utilizationTarget: 50,
  },
];

function iso(dayOffset: number, hour: number, minute = 0): string {
  const base = addDays(startOfWeek(today), 7 + dayOffset);
  return toISO(addHours(base, hour + minute / 60));
}

function addHoursISO(s: string, h: number): string {
  return toISO(addHours(parseISO(s), h));
}
function addDaysISO(s: string, d: number): string {
  return toISO(addDays(parseISO(s), d));
}

function qRec(userId: string, qualificationId: string, grantedOffsetDays: number, validityMonths: number): QualificationRecord {
  const granted = addDays(today, grantedOffsetDays);
  const expire = addDays(granted, validityMonths * 30);
  return {
    id: `qr-${userId}-${qualificationId}`,
    userId,
    qualificationId,
    grantedAt: toISO(granted),
    expireAt: toISO(expire),
  };
}

export const qualificationRecords: QualificationRecord[] = [
  qRec("u1", "q1", -700, 24),
  qRec("u1", "q3", -400, 18),
  qRec("u2", "q1", -300, 24),
  qRec("u2", "q2", -200, 12),
  qRec("u3", "q1", -120, 24),
  qRec("u3", "q5", -90, 12),
  qRec("u4", "q2", -150, 12),
  qRec("u4", "q3", -300, 18),
  qRec("u5", "q2", -340, 12),
  qRec("u6", "q4", -260, 24),
  qRec("u6", "q5", -700, 12),
  qRec("u7", "q1", -10, 24),
  qRec("u8", "q2", -300, 12),
  qRec("u8", "q3", -200, 18),
  qRec("u5", "q3", -360, 18),
];

interface ResSeed {
  instrumentId: string;
  userId: string;
  dayOffset: number;
  startHour: number;
  durationHours: number;
  status: Reservation["status"];
  purpose: string;
  reviewNote?: string;
}

const resSeeds: ResSeed[] = [
  { instrumentId: "ins1", userId: "u3", dayOffset: -7, startHour: 9, durationHours: 3, status: "completed", purpose: "ZnO 纳米线阵列形貌表征" },
  { instrumentId: "ins2", userId: "u4", dayOffset: -6, startHour: 10, durationHours: 2, status: "completed", purpose: "肿瘤细胞周期分析" },
  { instrumentId: "ins3", userId: "u4", dayOffset: -5, startHour: 14, durationHours: 2, status: "completed", purpose: "细胞骨架双染成像" },
  { instrumentId: "ins5", userId: "u6", dayOffset: -5, startHour: 9, durationHours: 4, status: "completed", purpose: "催化产物液相组成分析" },
  { instrumentId: "ins6", userId: "u7", dayOffset: -4, startHour: 13, durationHours: 1, status: "completed", purpose: "纳米金溶液 UV-Vis 表征" },
  { instrumentId: "ins1", userId: "u1", dayOffset: -3, startHour: 10, durationHours: 2.5, status: "completed", purpose: "钙钛矿薄膜截面形貌" },
  { instrumentId: "ins2", userId: "u5", dayOffset: -3, startHour: 15, durationHours: 2, status: "completed", purpose: "免疫细胞分选" },
  { instrumentId: "ins3", userId: "u1", dayOffset: -2, startHour: 9, durationHours: 3, status: "completed", purpose: "组织切片三维重建" },
  { instrumentId: "ins5", userId: "u6", dayOffset: -2, startHour: 14, durationHours: 3, status: "completed", purpose: "反应动力学在线监测" },
  { instrumentId: "ins1", userId: "u3", dayOffset: -14, startHour: 9, durationHours: 3, status: "completed", purpose: "复合气凝胶骨架观察" },
  { instrumentId: "ins3", userId: "u4", dayOffset: -14, startHour: 13, durationHours: 2, status: "completed", purpose: "荧光探针共定位" },
  { instrumentId: "ins5", userId: "u7", dayOffset: -13, startHour: 10, durationHours: 4, status: "completed", purpose: "多糖分子量测定" },
  { instrumentId: "ins2", userId: "u5", dayOffset: -12, startHour: 10, durationHours: 2, status: "completed", purpose: "干细胞表面标志检测" },
  { instrumentId: "ins6", userId: "u6", dayOffset: -12, startHour: 15, durationHours: 1, status: "completed", purpose: "催化剂吸光度测定" },
  { instrumentId: "ins1", userId: "u1", dayOffset: -21, startHour: 10, durationHours: 2, status: "completed", purpose: "薄膜厚度标定" },
  { instrumentId: "ins3", userId: "u4", dayOffset: -21, startHour: 14, durationHours: 3, status: "completed", purpose: "活细胞长时程成像" },
  { instrumentId: "ins5", userId: "u6", dayOffset: -20, startHour: 9, durationHours: 5, status: "completed", purpose: "手性化合物拆分" },
  { instrumentId: "ins1", userId: "u3", dayOffset: 1, startHour: 9, durationHours: 3, status: "completed", purpose: "纳米颗粒粒径与团聚观察" },
  { instrumentId: "ins5", userId: "u6", dayOffset: 1, startHour: 14, durationHours: 3, status: "completed", purpose: "底物转化率测定" },
  { instrumentId: "ins3", userId: "u4", dayOffset: 2, startHour: 10, durationHours: 2, status: "completed", purpose: "荧光蛋白表达定量" },
  { instrumentId: "ins2", userId: "u4", dayOffset: 3, startHour: 10, durationHours: 2, status: "approved", purpose: "外泌体表面标志分选" },
  { instrumentId: "ins5", userId: "u7", dayOffset: 3, startHour: 14, durationHours: 2, status: "approved", purpose: "聚合物分子量分析" },
  { instrumentId: "ins6", userId: "u6", dayOffset: 4, startHour: 9, durationHours: 1, status: "approved", purpose: "动力学吸光度跟踪" },
  { instrumentId: "ins1", userId: "u1", dayOffset: 4, startHour: 13, durationHours: 3, status: "approved", purpose: "多孔硅形貌与能谱" },
  { instrumentId: "ins1", userId: "u3", dayOffset: 3, startHour: 13, durationHours: 3, status: "in_progress", purpose: "锂电负极材料截面表征" },
  { instrumentId: "ins2", userId: "u5", dayOffset: 4, startHour: 15, durationHours: 2, status: "pending", purpose: "T 细胞亚群分选" },
  { instrumentId: "ins3", userId: "u1", dayOffset: 5, startHour: 9, durationHours: 3, status: "pending", purpose: "类器官三维成像" },
  { instrumentId: "ins1", userId: "u7", dayOffset: 5, startHour: 14, durationHours: 2, status: "pending", purpose: "MOF 晶体形貌观察" },
  { instrumentId: "ins2", userId: "u3", dayOffset: 2, startHour: 9, durationHours: 2, status: "rejected", purpose: "细菌流式计数", reviewNote: "申请人未持 FACS 资质，请先完成培训认证。" },
  { instrumentId: "ins3", userId: "u6", dayOffset: 3, startHour: 11, durationHours: 1.5, status: "rejected", purpose: "矿物荧光观察", reviewNote: "时段与维护窗口冲突，请改约其他时段。" },
  { instrumentId: "ins5", userId: "u7", dayOffset: 2, startHour: 16, durationHours: 2, status: "cancelled", purpose: "标准品复核" },
];

export const reservations: Reservation[] = resSeeds.map((s, i) => {
  const start = iso(s.dayOffset, s.startHour);
  const end = addHoursISO(start, s.durationHours);
  const user = users.find((u) => u.id === s.userId)!;
  return {
    id: `r${i + 1}`,
    instrumentId: s.instrumentId,
    userId: s.userId,
    groupId: user.groupId,
    start,
    end,
    purpose: s.purpose,
    durationHours: s.durationHours,
    status: s.status,
    reviewNote: s.reviewNote,
    createdAt: addDaysISO(start, -2),
  };
});

export const maintenancePlans: MaintenancePlan[] = [
  {
    id: "m1",
    instrumentId: "ins4",
    title: "TEM 物镜光阑清洗与对中",
    start: iso(3, 9),
    end: iso(4, 18),
    recurrence: "none",
    assignee: "林晓彤",
    note: "由厂家工程师驻场维护，期间禁止开机与预约。",
    createdAt: addDaysISO(iso(0, 9), -5),
  },
  {
    id: "m2",
    instrumentId: "ins1",
    title: "SEM 电子枪灯丝更换",
    start: iso(6, 9),
    end: iso(6, 12),
    recurrence: "weekly",
    assignee: "林晓彤",
    note: "每周一上午例行更换灯丝与真空系统检查。",
    createdAt: addDaysISO(iso(0, 9), -20),
  },
  {
    id: "m3",
    instrumentId: "ins2",
    title: "流式分选仪流路消毒",
    start: iso(2, 8),
    end: iso(2, 9),
    recurrence: "weekly",
    assignee: "吴佳琪",
    note: "每周三开机前执行 70% 乙醇流路消毒与校准。",
    createdAt: addDaysISO(iso(0, 9), -20),
  },
  {
    id: "m4",
    instrumentId: "ins5",
    title: "HPLC 色谱柱再生与系统检漏",
    start: iso(7, 14),
    end: iso(7, 17),
    recurrence: "monthly",
    assignee: "吴佳琪",
    note: "每月末执行色谱柱再生、泵密封检查与管路检漏。",
    createdAt: addDaysISO(iso(0, 9), -30),
  },
  {
    id: "m5",
    instrumentId: "ins3",
    title: "共聚焦激光功率校准",
    start: iso(5, 8),
    end: iso(5, 10),
    recurrence: "monthly",
    assignee: "林晓彤",
    note: "每月一次激光功率与共聚焦针孔校准，确保成像质量。",
    createdAt: addDaysISO(iso(0, 9), -30),
  },
];

const anomalyBank: Record<string, { anomaly: string; status: UsageLog["instrumentStatus"]; consumables: string }> = {
  ok: { anomaly: "无异常，仪器运行稳定。", status: "normal", consumables: "导电胶带 1 卷、液氮 2 L" },
  minor: { anomaly: "成像时偶发轻微漂移，已重置焦距，不影响数据。", status: "minor_issue", consumables: "载玻片 5 片" },
  fault: { anomaly: "真空度未达阈值，疑似样品室密封圈老化，已报修。", status: "fault", consumables: "—" },
};

const logMap: Record<string, keyof typeof anomalyBank> = {
  r1: "ok", r2: "ok", r3: "minor", r4: "ok", r5: "ok", r6: "ok", r7: "ok", r8: "ok", r9: "fault",
  r10: "ok", r11: "ok", r12: "ok", r13: "ok", r14: "ok", r15: "ok", r16: "ok", r17: "minor",
  r18: "ok", r19: "ok", r20: "ok",
};

export const usageLogs: UsageLog[] = reservations
  .filter((r) => r.status === "completed")
  .map((r, idx) => {
    const key = logMap[r.id] ?? "ok";
    const meta = anomalyBank[key];
    const actual = Math.min(r.durationHours + (key === "fault" ? -0.5 : 0.25), r.durationHours + 0.5);
    return {
      id: `log-${idx + 1}`,
      reservationId: r.id,
      instrumentId: r.instrumentId,
      userId: r.userId,
      groupId: r.groupId,
      actualDurationHours: Math.round(actual * 4) / 4,
      instrumentStatus: meta.status,
      anomaly: meta.anomaly,
      consumables: meta.consumables,
      createdAt: addHoursISO(r.end, 1),
    };
  });

export function seedData() {
  return {
    groups,
    users,
    qualifications,
    instruments,
    qualificationRecords,
    reservations,
    maintenancePlans,
    usageLogs,
  };
}
