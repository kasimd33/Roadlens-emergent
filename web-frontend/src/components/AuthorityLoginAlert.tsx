import React from "react";
import { AlertTriangle, MapPin, X, ChevronRight, Siren } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Complaint } from "../types";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1709934730506-fba12664d4e4";

interface AuthorityLoginAlertProps {
  open: boolean;
  complaints: Complaint[];
  onClose: () => void;
  onSelect: (complaint: Complaint) => void;
}

/** Unresolved dispatches first, newest first within each group. */
function sortAlertComplaints(complaints: Complaint[]): Complaint[] {
  const activeStatuses = new Set(["SUBMITTED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"]);
  return [...complaints].sort((a, b) => {
    const aActive = activeStatuses.has(a.status) ? 0 : 1;
    const bActive = activeStatuses.has(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export const AuthorityLoginAlert: React.FC<AuthorityLoginAlertProps> = ({
  open,
  complaints,
  onClose,
  onSelect,
}) => {
  if (!open) return null;

  const sorted = sortAlertComplaints(complaints);
  const activeCount = sorted.filter((c) =>
    ["SUBMITTED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"].includes(c.status)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="High severity dispatch alert"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 text-white px-4 py-4 flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Siren size={22} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black leading-tight">Critical Dispatch Alert</h2>
            <p className="text-xs text-red-100 mt-0.5 leading-snug">
              {sorted.length} high-severity report{sorted.length === 1 ? "" : "s"} assigned to your division
              {activeCount > 0 && (
                <> &middot; <span className="font-bold">{activeCount} awaiting action</span></>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Dismiss alert"
            className="p-1 rounded hover:bg-white/20 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Complaint list */}
        <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-100">
          {sorted.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 transition-colors"
            >
              <img
                src={c.image_url || (c.image_base64
                  ? c.image_base64.startsWith("data:")
                    ? c.image_base64
                    : `data:image/jpeg;base64,${c.image_base64}`
                  : FALLBACK_IMG)}
                alt={c.title}
                className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-red-600 uppercase bg-red-100 rounded px-1.5 py-0.5">
                    HIGH
                  </span>
                  <StatusBadge status={c.status} size="sm" />
                </div>
                <p className="text-[13px] font-bold text-gray-800 truncate mt-1">{c.title}</p>
                <div className="flex items-center min-w-0 mt-0.5">
                  <MapPin size={11} className="text-gray-400 mr-1 shrink-0" />
                  <span className="text-[11px] text-gray-500 truncate">{c.location_name}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400">
            <AlertTriangle size={12} className="text-amber-500" />
            Shown once per login
          </span>
          <button
            onClick={onClose}
            className="bg-red-600 text-white text-xs font-black uppercase tracking-wide rounded-lg px-4 py-2 hover:bg-red-700 transition-colors"
          >
            Review Later
          </button>
        </div>
      </div>
    </div>
  );
};
