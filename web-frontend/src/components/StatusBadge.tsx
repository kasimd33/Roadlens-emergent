import React from "react";
import type { ComplaintStatus } from "../types";

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: "sm" | "md";
}

const STATUS_MAP: Record<string, { classes: string; label: string }> = {
  SUBMITTED:    { classes: "bg-white/[0.05] text-fog", label: "Submitted" },
  ASSIGNED:     { classes: "bg-signal-teal/15 text-signal-teal border border-signal-teal/30", label: "Assigned" },
  ACKNOWLEDGED: { classes: "bg-iris-violet/15 text-iris-violet border border-iris-violet/30", label: "Acknowledged" },
  IN_PROGRESS:  { classes: "bg-lavender/15 text-lavender border border-lavender/30", label: "In Progress" },
  RESOLVED:     { classes: "bg-pulse-green/15 text-pulse-green border border-pulse-green/30", label: "Resolved" },
  CLOSED:       { classes: "bg-white/[0.05] text-ash", label: "Closed" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const s = (status || "SUBMITTED").toUpperCase();
  const { classes, label } = STATUS_MAP[s] || { classes: "bg-white/[0.05] text-fog", label: s };
  const px = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center rounded font-medium tracking-wide ${px} ${classes}`}>
      {label}
    </span>
  );
};
