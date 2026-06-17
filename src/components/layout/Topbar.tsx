import { useState } from "react";
import { useStore, roleLabels } from "@/store/useStore";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronDown, UserCheck, RefreshCw, Menu } from "lucide-react";
import { roleMeta } from "@/lib/status";
import { cn } from "@/lib/utils";
import { navSections } from "@/lib/nav";
import { NavLink } from "react-router-dom";
import type { Role } from "@/types";

export function Topbar({ onToggleMobile }: { onToggleMobile: () => void }) {
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const resetDemo = useStore((s) => s.resetDemo);
  const currentUser = users.find((u) => u.id === currentUserId)!;
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-ink-600/80 bg-ink-900/80 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onToggleMobile}
        className="btn-subtle h-9 w-9 p-0 lg:hidden"
        aria-label="菜单"
      >
        <Menu size={18} />
      </button>

      <div className="flex flex-1 items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-phosphor shadow-[0_0_8px_#2DD4BF]" />
          <span className="tick-label">LabSync · 共享仪器时段分配平台</span>
        </div>
      </div>

      <button
        onClick={() => {
          if (confirm("确定要重置演示数据吗？所有变更将被清除。")) resetDemo();
        }}
        className="btn-subtle hidden h-9 px-3 sm:inline-flex"
        title="重置演示数据"
      >
        <RefreshCw size={14} />
        重置
      </button>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg border border-ink-600 bg-ink-800/60 py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-ink-500 hover:bg-ink-700/60"
        >
          <Avatar name={currentUser.name} color={currentUser.avatarColor} size={28} />
          <div className="hidden text-left leading-tight sm:block">
            <p className="text-xs font-medium text-ink-50">{currentUser.name}</p>
            <p className={cn("text-[10px]", roleMeta[currentUser.role].text)}>
              {roleLabels[currentUser.role]}
            </p>
          </div>
          <ChevronDown size={14} className="text-ink-300" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="panel absolute right-0 top-12 z-50 w-64 animate-rise p-2 shadow-panel">
              <p className="px-3 py-2 tick-label">切换演示角色</p>
              <div className="space-y-0.5">
                {users.map((u) => {
                  const active = u.id === currentUserId;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                        active ? "bg-phosphor/10" : "hover:bg-ink-700/60",
                      )}
                    >
                      <Avatar name={u.name} color={u.avatarColor} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink-50">{u.name}</p>
                        <p className="truncate text-[10px] text-ink-300">{u.title}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] ring-1 ring-inset",
                          roleMeta[u.role].ring,
                          roleMeta[u.role].text,
                        )}
                      >
                        {roleLabels[u.role]}
                      </span>
                      {active && <UserCheck size={14} className="text-phosphor-soft" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  if (!open) return null;
  const hasAccess = (roles: Role[] | undefined) => !roles || roles.includes(currentUser.role);
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-64 animate-rise border-r border-ink-600 bg-ink-850 p-4">
        {navSections.map((section) => {
          const items = section.items.filter((it) => hasAccess(it.roles));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-4">
              <p className="px-3 pb-2 tick-label">{section.title}</p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                          isActive ? "bg-phosphor/10 text-ink-50" : "text-ink-200 hover:bg-ink-700/50",
                        )
                      }
                    >
                      <Icon size={16} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
