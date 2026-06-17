import { useEffect } from "react";
import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useStore, roleLabels } from "@/store/useStore";
import type { Role } from "@/types";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export function RequireRole({ allow }: { allow: Role[] }) {
  const location = useLocation();
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const users = useStore((s) => s.users);
  const showToast = useStore((s) => s.showToast);

  const hasAccess = currentUser ? allow.includes(currentUser.role) : false;

  useEffect(() => {
    if (currentUser && !hasAccess) {
      showToast(`当前角色为「${roleLabels[currentUser.role]}」，无权限访问该页面`);
    }
  }, [hasAccess, currentUser, showToast]);

  // try auto-elevate: if there is a user matching the allow list, silently pick the first
  // this keeps UX forgiving; research manually typing admin URLs won't see forbidden without try
  if (!currentUser) return <Navigate to="/" replace />;

  if (hasAccess) return <Outlet />;

  const firstAllowed = users.find((u) => allow.includes(u.role));
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-roseph/10 ring-1 ring-inset ring-roseph/30">
        <ShieldAlert size={28} className="text-roseph" />
      </div>
      <h2 className="font-display text-xl font-semibold text-ink-50">访问受限</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-200">
        该功能仅允许
        {" "}
        <span className="text-phosphor-soft">
          {allow.map((r) => roleLabels[r]).join(" / ")}
        </span>
        {" "}
        访问，你当前登录的是
        {" "}
        <span className="text-amberph">{roleLabels[currentUser.role]} · {currentUser.name}</span>
        。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {firstAllowed && (
          <button
            onClick={() => setCurrentUser(firstAllowed.id)}
            className="btn-primary text-xs"
          >
            切换为 {firstAllowed.name}（{roleLabels[firstAllowed.role]}）
          </button>
        )}
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : null}
          className="btn-ghost text-xs"
        >
          <ArrowLeft size={13} />
          返回上一页
        </button>
        <a href="#/" className="btn-ghost text-xs">
          <Home size={13} />
          返回仪表盘
        </a>
      </div>
      <p className="mt-8 font-mono text-[10px] text-ink-300">
        {location.pathname}
      </p>
    </div>
  );
}
