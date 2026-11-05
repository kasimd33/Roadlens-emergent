import React from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

interface SeverityBadgeProps {
  severity: string;
  size?: "sm" | "md" | "lg";
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = "md" }) => {
  const sev = (severity || "LOW").toUpperCase();
  let bg = "#16A34A", text = "Low Hazard", Icon = CheckCircle;
  if (sev === "HIGH") { bg = "#DC2626"; text = "High Severity"; Icon = AlertCircle; }
  else if (sev === "MEDIUM") { bg = "#D97706"; text = "Medium Severity"; Icon = AlertTriangle; }
  else if (sev === "NONE") { bg = "#6B7280"; text = "No Damage"; Icon = Info; }

  const px = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";
  const iconSize = size === "sm" ? 10 : size === "lg" ? 16 : 12;

  return (
    <span className={`inline-flex items-center gap-1 rounded font-bold text-white uppercase tracking-wide ${px}`} style={{ backgroundColor: bg }}>
      <Icon size={iconSize} />
      {text}
    </span>
  );
};
