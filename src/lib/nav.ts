import type { Role } from "@/types";
import {
  LayoutDashboard,
  Microscope,
  CalendarRange,
  CalendarCheck,
  ShieldCheck,
  ClipboardList,
  Wrench,
  Award,
  BarChart3,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  badge?: "pending" | "logs";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "工作台",
    items: [
      { to: "/", label: "仪表盘", icon: LayoutDashboard },
    ],
  },
  {
    title: "仪器与预约",
    items: [
      { to: "/instruments", label: "仪器列表", icon: Microscope },
      { to: "/calendar", label: "预约日历", icon: CalendarRange },
      { to: "/reservations", label: "我的预约", icon: CalendarCheck },
    ],
  },
  {
    title: "管理与记录",
    items: [
      { to: "/reviews", label: "审核中心", icon: ShieldCheck, roles: ["admin", "director"], badge: "pending" },
      { to: "/logs", label: "使用日志", icon: ClipboardList, badge: "logs" },
      { to: "/maintenance", label: "维护计划", icon: Wrench, roles: ["admin", "director"] },
    ],
  },
  {
    title: "系统与决策",
    items: [
      { to: "/audit", label: "操作记录", icon: ScrollText, roles: ["admin", "director"] },
      { to: "/qualifications", label: "资质管理", icon: Award, roles: ["director", "admin"] },
      { to: "/analytics", label: "统计分析", icon: BarChart3 },
    ],
  },
];
