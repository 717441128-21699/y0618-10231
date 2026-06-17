import { NavLink } from "react-router-dom";
import { navSections } from "@/lib/nav";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { Atom } from "lucide-react";
import type { Role } from "@/types";

function hasAccess(roles: Role[] | undefined, current: Role): boolean {
  if (!roles) return true;
  return roles.includes(current);
}

export function Sidebar() {
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  const reservations = useStore((s) => s.reservations);

  const pendingCount = reservations.filter((r) => r.status === "pending").length;
  const logCount = reservations.filter(
    (r) => r.status === "approved" || r.status === "in_progress",
  ).length;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-600/80 bg-ink-850/60 lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-ink-600/80 px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-phosphor/30 to-phosphor/5 ring-1 ring-inset ring-phosphor/40">
          <Atom size={18} className="text-phosphor-soft" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse-dot rounded-full bg-phosphor shadow-[0_0_8px_#2DD4BF]" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold text-ink-50">LabSync</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-300">仪器预约控制台</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          const items = section.items.filter((it) => hasAccess(it.roles, currentUser.role));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-5">
              <p className="px-3 pb-2 tick-label">{section.title}</p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const badge =
                    item.badge === "pending"
                      ? pendingCount
                      : item.badge === "logs"
                        ? logCount
                        : 0;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-phosphor/10 text-ink-50"
                            : "text-ink-200 hover:bg-ink-700/50 hover:text-ink-50",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-phosphor shadow-[0_0_8px_#2DD4BF]" />
                          )}
                          <Icon
                            size={16}
                            className={cn(isActive ? "text-phosphor-soft" : "text-ink-300 group-hover:text-ink-100")}
                          />
                          <span className="flex-1">{item.label}</span>
                          {badge > 0 && (
                            <span className="rounded-full bg-amberph/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amberph ring-1 ring-inset ring-amberph/30">
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-ink-600/80 p-3">
        <div className="rounded-lg bg-ink-900/50 p-3">
          <p className="tick-label mb-1">系统状态</p>
          <div className="flex items-center gap-2 text-xs text-ink-100">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emeraldph shadow-[0_0_6px_#34D399]" />
            实时同步中
          </div>
        </div>
      </div>
    </aside>
  );
}
