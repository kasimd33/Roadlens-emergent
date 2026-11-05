import React from "react";
import { CheckCircle, RefreshCw } from "lucide-react";
import type { StatusHistoryItem, ComplaintStatus } from "../types";

interface StatusTimelineProps {
  currentStatus: ComplaintStatus;
  history: StatusHistoryItem[];
}

const STAGES: { key: ComplaintStatus; label: string; desc: string }[] = [
  { key: "SUBMITTED",    label: "Submitted",    desc: "Citizen filed report with AI damage scan" },
  { key: "ASSIGNED",     label: "Assigned",     desc: "Routed to municipal repair division" },
  { key: "ACKNOWLEDGED", label: "Acknowledged", desc: "Authority acknowledged dispatch order" },
  { key: "IN_PROGRESS",  label: "In Progress",  desc: "On-site field repairs underway" },
  { key: "RESOLVED",     label: "Resolved",     desc: "Repairs completed with proof evidence" },
  { key: "CLOSED",       label: "Closed",       desc: "Citizen / Admin verified and closed" },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus, history }) => {
  const stageOrder = STAGES.map(s => s.key);
  const currentIndex = stageOrder.indexOf(currentStatus);

  const fmt = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  return (
    <div className="my-4">
      <h3 className="text-sm font-medium text-paper mb-4">Lifecycle Milestone Tracker</h3>
      <div className="space-y-0">
        {STAGES.map((stage, idx) => {
          const isPassed = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const historyEntry = history.find(h => h.status === stage.key);

          return (
            <div key={stage.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 flex-shrink-0 ${
                  isCurrent ? "bg-void border-acid-lime" : isPassed ? "bg-mist border-mist" : "bg-obsidian border-graphite"
                }`}>
                  {isPassed ? (
                    isCurrent ? <RefreshCw size={12} className="text-acid-lime" /> : <CheckCircle size={12} className="text-void" />
                  ) : (
                    <span className="text-[10px] font-medium text-ash">{idx + 1}</span>
                  )}
                </div>
                {idx < STAGES.length - 1 && (
                  <div className={`w-0.5 flex-1 my-0.5 ${idx < currentIndex ? "bg-smoke" : "bg-graphite"}`} style={{ minHeight: 20 }} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isCurrent ? "text-paper" : isPassed ? "text-mist" : "text-ash"}`}>
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-medium bg-acid-lime/15 text-acid-lime px-1.5 py-0.5 rounded uppercase tracking-wide">Current Stage</span>
                  )}
                </div>
                {historyEntry ? (
                  <div className="mt-1">
                    <p className="text-xs text-mist">{historyEntry.notes || stage.desc}</p>
                    <p className="text-[11px] text-fog mt-0.5 font-berkeley-mono">
                      By {historyEntry.changed_by_name} ({historyEntry.changed_by_role}) • {fmt(historyEntry.timestamp)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-ash italic mt-0.5">{stage.desc}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
