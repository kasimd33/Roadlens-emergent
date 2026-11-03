import React, { useState } from "react";
import { X, Send } from "lucide-react";
import type { Authority } from "../types";

interface AssignModalProps {
  complaintId: string;
  complaintTitle: string;
  authorities: Authority[];
  currentAssignedId?: string | null;
  onClose: () => void;
  onAssign: (authorityId: string, notes: string) => Promise<void>;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  complaintId,
  complaintTitle,
  authorities,
  currentAssignedId,
  onClose,
  onAssign,
}) => {
  const [selectedAuthId, setSelectedAuthId] = useState<string>(
    currentAssignedId || authorities[0]?.id || "",
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssign = async () => {
    if (!selectedAuthId) return;
    setIsSubmitting(true);
    try {
      await onAssign(selectedAuthId, notes);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92svh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 pr-2">
            <h3 className="text-[17px] font-black text-gray-800">Dispatch &amp; Assign Authority</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Ticket #{complaintId.slice(-5)?.toUpperCase() || complaintId}: {complaintTitle}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs font-bold text-gray-800 mb-2">Select Municipal Division / Department:</p>
        <div className="space-y-2">
          {authorities.map((auth) => {
            const isSelected = selectedAuthId === auth.id;
            return (
              <button
                key={auth.id}
                onClick={() => setSelectedAuthId(auth.id)}
                className={`w-full flex items-center gap-2.5 border-[1.5px] rounded-lg p-2.5 text-left ${
                  isSelected ? "border-blue-700 bg-gray-100" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <span
                  className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? "border-blue-700" : "border-gray-300"
                  }`}
                >
                  {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-blue-700" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold text-gray-800 truncate">{auth.name}</span>
                  <span className="block text-[11px] font-semibold text-blue-700 mt-0.5">
                    Zone: {auth.zone}
                  </span>
                  <span className="block text-[10px] text-gray-500 mt-0.5 truncate">
                    Coverage: {auth.coverage_area}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-bold text-gray-800 mt-4 mb-2">Dispatch Instructions (Optional):</p>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Priority dispatch due to peak hour traffic congestion."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleAssign}
          disabled={isSubmitting || !selectedAuthId}
          className="w-full flex items-center justify-center gap-1.5 bg-blue-700 text-white text-sm font-bold rounded-lg py-3 mt-4 hover:bg-blue-800 disabled:opacity-70"
        >
          {isSubmitting ? (
            "Dispatching…"
          ) : (
            <>
              <Send size={16} /> Dispatch to Authority
            </>
          )}
        </button>
      </div>
    </div>
  );
};
