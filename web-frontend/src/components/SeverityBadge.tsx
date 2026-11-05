import React from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

interface SeverityBadgeProps {
  severity: string;
  size?: "sm" | "md" | "lg";
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = "md" }) => {
  const sev = (severity || "LOW").toUpperCase();
  let classes = "bg-white/[0.05] text-fog border border-graphite", text = "Low Hazard", Icon = CheckCircle;
  if (sev === "HIGH") { classes = "bg-coral-red/15 text-coral-red border border-coral-red/30"; text = "High Severity"; Icon = AlertCircle; }
  else if (sev === "MEDIUM") { classes = "bg-lavender/15 text-lavender border border-lavender/30"; text = "Medium Severity"; Icon = AlertTriangle; }
  else if (sev === "NONE") { classes = "bg-white/[0.05] text-ash border border-graphite"; text = "No Damage"; Icon = Info; }

  const px = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";
  const iconSize = size === "sm" ? 10 : size === "lg" ? 16 : 12;

  return (
    <span className={`inline-flex items-center gap-1 rounded font-medium uppercase tracking-wide ${px} ${classes}`}>
      <Icon size={iconSize} />
      {text}
    </span>
  );
};
