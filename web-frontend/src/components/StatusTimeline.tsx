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
      <h3 className="text-sm font-bold text-gray-800 mb-4">Lifecycle Milestone Tracker</h3>
      <div className="space-y-0">
        {STAGES.map((stage, idx) => {
          const isPassed = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const historyEntry = history.find(h => h.status === stage.key);

          return (
            <div key={stage.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 flex-shrink-0 ${
                  isCurrent ? "bg-blue-600 border-blue-400" : isPassed ? "bg-green-600 border-green-500" : "bg-gray-100 border-gray-300"
                }`}>
                  {isPassed ? (
                    isCurrent ? <RefreshCw size={12} className="text-white" /> : <CheckCircle size={12} className="text-white" />
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400">{idx + 1}</span>
                  )}
                </div>
                {idx < STAGES.length - 1 && (
                  <div className={`w-0.5 flex-1 my-0.5 ${idx < currentIndex ? "bg-green-500" : "bg-gray-200"}`} style={{ minHeight: 20 }} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isCurrent ? "text-blue-600" : isPassed ? "text-gray-800" : "text-gray-400"}`}>
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">Current Stage</span>
                  )}
                </div>
                {historyEntry ? (
                  <div className="mt-1">
                    <p className="text-xs text-gray-600">{historyEntry.notes || stage.desc}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      By {historyEntry.changed_by_name} ({historyEntry.changed_by_role}) • {fmt(historyEntry.timestamp)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mt-0.5">{stage.desc}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
