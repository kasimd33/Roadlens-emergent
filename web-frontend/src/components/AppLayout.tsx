import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, ScanLine, FileText, Wrench, Bell } from "lucide-react";
import { Navbar } from "./Navbar";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { NotificationItem } from "../types";

const TABS = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutGrid, roles: ["USER", "AUTHORITY", "ADMIN"] },
  { to: "/inspect", label: "Inspect", Icon: ScanLine, roles: ["USER", "AUTHORITY", "ADMIN"] },
  { to: "/complaints", label: "Complaints", Icon: FileText, roles: ["USER", "AUTHORITY", "ADMIN"] },
  { to: "/workspace", label: "Workspace", Icon: Wrench, roles: ["AUTHORITY", "ADMIN"] },
  { to: "/notifications", label: "Alerts", Icon: Bell, roles: ["USER", "AUTHORITY", "ADMIN"] },
];

export const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Poll notifications for the unread badge (same cadence as the mobile tab bar)
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
    refetchInterval: 10_000,
    enabled: !!user,
  });

  const unreadCount = (notifications || []).filter((n: NotificationItem) => !n.read).length;
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));

  return (
    <div className="min-h-svh flex flex-col bg-void">
      <Navbar />

      {/* Desktop tab strip */}
      <nav className="hidden sm:flex bg-void border-b border-graphite px-4 gap-1 sticky top-[57px] z-30">
        {visibleTabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 text-[13px] font-normal border-b-2 -mb-px transition-colors ${
                isActive
                  ? "text-paper border-acid-lime"
                  : "text-fog border-transparent hover:text-mist"
              }`
            }
          >
            <Icon size={16} />
            {label}
            {to === "/notifications" && unreadCount > 0 && (
              <span className="ml-0.5 bg-acid-lime text-void text-[10px] font-medium rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-5 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-carbon border-t border-graphite flex z-40">
        {visibleTabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => navigate(to)}
            className={({ isActive }) =>
              `relative flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-normal ${
                isActive ? "text-paper" : "text-ash"
              }`
            }
          >
            <Icon size={20} />
            {label}
            {to === "/notifications" && unreadCount > 0 && (
              <span className="absolute top-1.5 right-[22%] bg-acid-lime text-void text-[9px] font-medium rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
