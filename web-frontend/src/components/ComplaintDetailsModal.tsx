import React, { useState } from "react";
import { ArrowLeft, MapPin, Building2, CheckCircle, Loader2, Camera } from "lucide-react";
import type { Complaint } from "../types";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { BoundingBoxView } from "./BoundingBoxView";
import { StatusTimeline } from "./StatusTimeline";
import { useAuth } from "../context/AuthContext";
import { fakeAuthorityName } from "../utils/fakeAuthority";

interface Props {
  complaint: Complaint | null;
  onClose: () => void;
  onStatusUpdate: (status: string, notes?: string, repairBase64?: string, repairUrl?: string) => Promise<void>;
}

export const ComplaintDetailsModal: React.FC<Props> = ({ complaint, onClose, onStatusUpdate }) => {
  const { role } = useAuth();
  const [isActing, setIsActing] = useState(false);
  const [showRepair, setShowRepair] = useState(false);
  const [repairNotes, setRepairNotes] = useState("");
  const [repairImageUrl, setRepairImageUrl] = useState("");

  if (!complaint) return null;

  const handleAction = async (status: string, notes?: string) => {
    setIsActing(true);
    try { await onStatusUpdate(status, notes); } finally { setIsActing(false); }
  };

  const handleRepairSubmit = async () => {
    setIsActing(true);
    try {
      await onStatusUpdate("RESOLVED", repairNotes, undefined, repairImageUrl || undefined);
      setShowRepair(false);
    } finally { setIsActing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-[#1E3A8A] px-4 pt-4 pb-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="p-1.5 text-white hover:bg-blue-700 rounded-lg">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm truncate">#{complaint.id.slice(-5).toUpperCase()}: {complaint.title}</p>
          <p className="text-blue-300 text-xs">RoadLens Civic Complaint</p>
        </div>
        <StatusBadge status={complaint.status} size="sm" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Image */}
        <BoundingBoxView imageUrl={complaint.image_url} imageBase64={complaint.image_base64} boundingBox={complaint.bounding_box} damageType={complaint.damage_type} confidence={complaint.confidence} severity={complaint.severity} height={220} />

        {/* Metrics */}
        <div className="flex items-center justify-between border rounded-xl p-3 bg-white">
          <div className="text-center flex-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Severity</p>
            <SeverityBadge severity={complaint.severity} size="sm" />
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center flex-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Confidence</p>
            <p className="text-sm font-bold text-gray-800">{complaint.confidence ? `${Math.round(complaint.confidence)}%` : "AI Verified"}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center flex-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Type</p>
            <p className="text-xs font-bold text-blue-700">{complaint.damage_type}</p>
          </div>
        </div>

        {/* Estimated repair cost (Indian municipal context) */}
        {complaint.estimated_cost_inr && (
          <div className="border border-green-200 bg-green-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-green-700 font-black text-sm">₹</span>
            <p className="text-xs text-green-800">
              <span className="font-bold">Estimated repair cost:</span> ₹{String(complaint.estimated_cost_inr).replace(/^₹/, "")}{" "}
              <span className="text-green-600">(indicative, municipal rate card)</span>
            </p>
          </div>
        )}

        {/* Location */}
        <div className="border rounded-xl p-3 space-y-3 bg-white">
          <div className="flex items-start gap-2">
            <MapPin size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-800">{complaint.location_name}</p>
              {complaint.landmark && <p className="text-xs text-gray-500">Landmark: {complaint.landmark}</p>}
              <p className="text-[10px] text-gray-400 font-mono">GPS: {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}</p>
            </div>
          </div>
          <div className="border-t pt-3 flex items-center gap-2">
            <Building2 size={18} className="text-blue-600 shrink-0" />
            <div className="flex-1">
              {role === "USER" ? (
                <>
                  <p className="text-sm font-bold text-gray-800">{complaint.assigned_authority_name ? fakeAuthorityName(complaint) : "Awaiting Routing"}</p>
                  <p className="text-xs text-gray-500">{complaint.assigned_authority_name ? "Officers near your location" : "Pending"}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-800">{complaint.assigned_authority_name ? fakeAuthorityName(complaint) : "UNASSIGNED (Pending Dispatch)"}</p>
                  <p className="text-xs text-gray-500">{complaint.assigned_authority_name ? "Assigned Municipal Unit" : "Awaiting Admin Routing"}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {complaint.description && (
          <div className="border rounded-xl p-3 bg-white">
            <p className="text-xs font-semibold text-gray-400 mb-1">Citizen Report Notes:</p>
            <p className="text-sm text-gray-700">{complaint.description}</p>
          </div>
        )}

        {/* Repair Evidence */}
        {complaint.repair_evidence && (
          <div className="border-2 border-green-300 rounded-xl p-3 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-green-600" />
              <p className="text-sm font-bold text-green-800">Repair Verified & Evidence Attached</p>
            </div>
            {(complaint.repair_evidence.image_url || complaint.repair_evidence.image_base64) && (
              <img src={complaint.repair_evidence.image_base64 || complaint.repair_evidence.image_url || ""} alt="Repair" className="w-full h-40 object-cover rounded-lg mb-2" />
            )}
            <p className="text-xs text-green-700">{complaint.repair_evidence.notes}</p>
            <p className="text-[10px] text-green-600 mt-1">Resolved by {complaint.repair_evidence.resolved_by_name} on {complaint.repair_evidence.resolved_at ? new Date(complaint.repair_evidence.resolved_at).toLocaleDateString() : "recently"}</p>
          </div>
        )}

        {/* Timeline */}
        <StatusTimeline currentStatus={complaint.status} history={complaint.status_history || []} />

        {/* Actions */}
        <div className="border-t pt-4">
          <p className="text-sm font-black text-gray-800 mb-3">Role Actions ({role})</p>

          {role === "AUTHORITY" && (
            <div className="space-y-2">
              {complaint.status === "ASSIGNED" && (
                <button onClick={() => handleAction("ACKNOWLEDGED", "Authority crew acknowledged work order.")} disabled={isActing} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white rounded-xl py-3 font-black text-sm hover:bg-amber-600 disabled:opacity-70">
                  {isActing ? <Loader2 size={18} className="animate-spin" /> : "Acknowledge Work Order"}
                </button>
              )}
              {(complaint.status === "ACKNOWLEDGED" || complaint.status === "ASSIGNED") && (
                <button onClick={() => handleAction("IN_PROGRESS", "Field repair unit arrived on site.")} disabled={isActing} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-black text-sm hover:bg-blue-700 disabled:opacity-70">
                  {isActing ? <Loader2 size={18} className="animate-spin" /> : "Start On-Site Work (In Progress)"}
                </button>
              )}
              {complaint.status === "IN_PROGRESS" && (
                <button onClick={() => setShowRepair(true)} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3 font-black text-sm hover:bg-green-700">
                  <Camera size={18} /> Upload Repair Proof & Resolve
                </button>
              )}
              {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (
                <div className="bg-green-100 rounded-xl p-3 text-center text-green-800 font-bold text-sm">Work is complete for this ticket.</div>
              )}
            </div>
          )}

          {role === "USER" && (
            <div>
              {complaint.status === "RESOLVED" ? (
                <button onClick={() => handleAction("CLOSED", "Citizen confirmed satisfactory road repair.")} disabled={isActing} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-black text-sm hover:bg-blue-700 disabled:opacity-70">
                  {isActing ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Confirm Repair & Close Complaint</>}
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-3">
                  <p className="text-sm text-gray-600">Municipal team is actively processing your ticket (#{complaint.id.slice(-5).toUpperCase()}).</p>
                </div>
              )}
            </div>
          )}

          {role === "ADMIN" && (
            <div className="flex gap-2">
              {complaint.status !== "CLOSED" && (
                <button onClick={() => handleAction("CLOSED", "Administrative closure following municipal review.")} disabled={isActing} className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl py-3 font-bold text-sm hover:bg-gray-900 disabled:opacity-70">
                  {isActing ? <Loader2 size={16} className="animate-spin" /> : "Close Ticket"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Repair Modal */}
      {showRepair && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md">
            <h3 className="font-black text-gray-800 mb-3">Upload Repair Evidence</h3>
            <label className="text-xs font-bold text-gray-600 block mb-1">Repair Image URL (optional)</label>
            <input value={repairImageUrl} onChange={e => setRepairImageUrl(e.target.value)} placeholder="https://..." className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <label className="text-xs font-bold text-gray-600 block mb-1">Work Completion Notes *</label>
            <textarea value={repairNotes} onChange={e => setRepairNotes(e.target.value)} rows={3} placeholder="Describe the repair work completed..." className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowRepair(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRepairSubmit} disabled={isActing || !repairNotes.trim()} className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-black hover:bg-green-700 disabled:opacity-70">
                {isActing ? "Submitting..." : "Submit & Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
