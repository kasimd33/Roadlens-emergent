import React from "react";
import type { ComplaintStatus } from "../types";

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: "sm" | "md";
}

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  SUBMITTED:    { bg: "#E0E7FF", color: "#3730A3", label: "Submitted" },
  ASSIGNED:     { bg: "#E0F2FE", color: "#0369A1", label: "Assigned" },
  ACKNOWLEDGED: { bg: "#FEF3C7", color: "#92400E", label: "Acknowledged" },
  IN_PROGRESS:  { bg: "#FFEDD5", color: "#C2410C", label: "In Progress" },
  RESOLVED:     { bg: "#DCFCE7", color: "#15803D", label: "Resolved" },
  CLOSED:       { bg: "#F3F4F6", color: "#4B5563", label: "Closed" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const s = (status || "SUBMITTED").toUpperCase();
  const { bg, color, label } = STATUS_MAP[s] || { bg: "#E5E7EB", color: "#374151", label: s };
  const px = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center rounded font-bold tracking-wide ${px}`} style={{ backgroundColor: bg, color }}>
      {label}
    </span>
  );
};
