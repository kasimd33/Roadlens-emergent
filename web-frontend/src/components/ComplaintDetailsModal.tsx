import React, { useState } from "react";
import { ArrowLeft, MapPin, Building2, CheckCircle, Loader2, Camera } from "lucide-react";
import type { Complaint, Authority } from "../types";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { BoundingBoxView } from "./BoundingBoxView";
import { StatusTimeline } from "./StatusTimeline";
import { useAuth } from "../context/AuthContext";

interface Props {
  complaint: Complaint | null;
  authorities: Authority[];
  onClose: () => void;
  onStatusUpdate: (status: string, notes?: string, repairBase64?: string, repairUrl?: string) => Promise<void>;
  onAssign: (authorityId: string, notes: string) => Promise<void>;
}

export const ComplaintDetailsModal: React.FC<Props> = ({ complaint, authorities, onClose, onStatusUpdate, onAssign }) => {
  const { role } = useAuth();
  const [isActing, setIsActing] = useState(false);
  const [showRepair, setShowRepair] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [repairNotes, setRepairNotes] = useState("");
  const [repairImageUrl, setRepairImageUrl] = useState("");
  const [assignAuthId, setAssignAuthId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

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

  const handleAssignSubmit = async () => {
    if (!assignAuthId) return;
    setIsActing(true);
    try {
      await onAssign(assignAuthId, assignNotes);
      setShowAssign(false);
    } finally { setIsActing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-void overflow-hidden">
      {/* Header */}
      <div className="bg-carbon border-b border-graphite px-4 pt-4 pb-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="p-1.5 text-mist hover:bg-obsidian rounded-md">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-paper font-medium text-sm truncate"><span className="font-berkeley-mono">#{complaint.id.slice(-5).toUpperCase()}</span>: {complaint.title}</p>
          <p className="text-ash text-xs">RoadLens Civic Complaint</p>
        </div>
        <StatusBadge status={complaint.status} size="sm" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Image */}
        <BoundingBoxView imageUrl={complaint.image_url} imageBase64={complaint.image_base64} boundingBox={complaint.bounding_box} damageType={complaint.damage_type} confidence={complaint.confidence} severity={complaint.severity} height={220} />

        {/* Metrics */}
        <div className="flex items-center justify-between border border-graphite rounded-xl p-3 bg-carbon">
          <div className="text-center flex-1">
            <p className="text-[10px] font-normal text-ash uppercase mb-1">Severity</p>
            <SeverityBadge severity={complaint.severity} size="sm" />
          </div>
          <div className="w-px h-8 bg-graphite" />
          <div className="text-center flex-1">
            <p className="text-[10px] font-normal text-ash uppercase mb-1">Confidence</p>
            <p className="text-sm font-medium text-paper">{complaint.confidence ? `${Math.round(complaint.confidence)}%` : "AI Verified"}</p>
          </div>
          <div className="w-px h-8 bg-graphite" />
          <div className="text-center flex-1">
            <p className="text-[10px] font-normal text-ash uppercase mb-1">Type</p>
            <p className="text-xs font-medium text-paper">{complaint.damage_type}</p>
          </div>
        </div>

        {/* Estimated repair cost (Indian municipal context) */}
        {complaint.estimated_cost_inr && (
          <div className="border border-graphite bg-obsidian rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-paper font-medium text-sm">₹</span>
            <p className="text-xs text-mist">
              <span className="font-medium">Estimated repair cost:</span> ₹{String(complaint.estimated_cost_inr).replace(/^₹/, "")}{" "}
              <span className="text-ash">(indicative, municipal rate card)</span>
            </p>
          </div>
        )}

        {/* Location */}
        <div className="border border-graphite rounded-xl p-3 space-y-3 bg-carbon">
          <div className="flex items-start gap-2">
            <MapPin size={18} className="text-ash mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-paper">{complaint.location_name}</p>
              {complaint.landmark && <p className="text-xs text-fog">Landmark: {complaint.landmark}</p>}
              <p className="text-[10px] text-ash font-berkeley-mono">GPS: {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}</p>
            </div>
          </div>
          <div className="border-t border-graphite pt-3 flex items-center gap-2">
            <Building2 size={18} className="text-ash shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-paper">{complaint.assigned_authority_name || "UNASSIGNED (Pending Dispatch)"}</p>
              <p className="text-xs text-fog">{complaint.assigned_authority_name ? "Assigned Municipal Unit" : "Awaiting Admin Routing"}</p>
            </div>
            {role === "ADMIN" && (
              <button onClick={() => setShowAssign(true)} className="text-xs font-normal border border-graphite text-mist px-2 py-1 rounded-md hover:border-smoke">
                {complaint.assigned_authority_id ? "Reassign" : "Assign"}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {complaint.description && (
          <div className="border border-graphite rounded-xl p-3 bg-carbon">
            <p className="text-xs font-normal text-ash mb-1">Citizen Report Notes:</p>
            <p className="text-sm text-mist">{complaint.description}</p>
          </div>
        )}

        {/* Repair Evidence */}
        {complaint.repair_evidence && (
          <div className="border border-pulse-green/30 bg-pulse-green/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-pulse-green" />
              <p className="text-sm font-medium text-paper">Repair Verified & Evidence Attached</p>
            </div>
            {(complaint.repair_evidence.image_url || complaint.repair_evidence.image_base64) && (
              <img src={complaint.repair_evidence.image_base64 || complaint.repair_evidence.image_url || ""} alt="Repair" className="w-full h-40 object-cover rounded-xl mb-2" />
            )}
            <p className="text-xs text-mist">{complaint.repair_evidence.notes}</p>
            <p className="text-[10px] text-ash mt-1">Resolved by {complaint.repair_evidence.resolved_by_name} on {complaint.repair_evidence.resolved_at ? new Date(complaint.repair_evidence.resolved_at).toLocaleDateString() : "recently"}</p>
          </div>
        )}

        {/* Timeline */}
        <StatusTimeline currentStatus={complaint.status} history={complaint.status_history || []} />

        {/* Actions */}
        <div className="border-t border-graphite pt-4">
          <p className="text-sm font-medium text-paper mb-3">Role Actions ({role})</p>

          {role === "AUTHORITY" && (
            <div className="space-y-2">
              {complaint.status === "ASSIGNED" && (
                <button onClick={() => handleAction("ACKNOWLEDGED", "Authority crew acknowledged work order.")} disabled={isActing} className="w-full flex items-center justify-center gap-2 bg-acid-lime text-void rounded-md py-3 font-medium text-sm hover:brightness-90 disabled:opacity-70">
                  {isActing ? <Loader2 size={18} className="animate-spin" /> : "Acknowledge Work Order"}
                </button>
              )}
              {(complaint.status === "ACKNOWLEDGED" || complaint.status === "ASSIGNED") && (
                <button onClick={() => handleAction("IN_PROGRESS", "Field repair unit arrived on site.")} disabled={isActing} className="w-full flex items-center justify-center gap-2 bg-acid-lime text-void rounded-md py-3 font-medium text-sm hover:brightness-90 disabled:opacity-70">
                  {isActing ? <Loader2 size={18} className="animate-spin" /> : "Start On-Site Work (In Progress)"}
                </button>
              )}
              {complaint.status === "IN_PROGRESS" && (
                <button onClick={() => setShowRepair(true)} className="w-full flex items-center justify-center gap-2 bg-acid-lime text-void rounded-md py-3 font-medium text-sm hover:brightness-90">
                  <Camera size={18} /> Upload Repair Proof & Resolve
                </button>
              )}
              {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (
                <div className="bg-obsidian border border-graphite rounded-xl p-3 text-center text-mist font-medium text-sm">Work is complete for this ticket.</div>
              )}
            </div>
          )}

          {role === "USER" && (
            <div>
              {complaint.status === "RESOLVED" ? (
                <button onClick={() => handleAction("CLOSED", "Citizen confirmed satisfactory road repair.")} disabled={isActing} className="w-full flex items-center justify-center gap-2 bg-acid-lime text-void rounded-md py-3 font-medium text-sm hover:brightness-90 disabled:opacity-70">
                  {isActing ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Confirm Repair & Close Complaint</>}
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-obsidian border border-graphite rounded-xl p-3">
                  <p className="text-sm text-mist">Municipal team is actively processing your ticket (<span className="font-berkeley-mono">#{complaint.id.slice(-5).toUpperCase()}</span>).</p>
                </div>
              )}
            </div>
          )}

          {role === "ADMIN" && (
            <div className="flex gap-2">
              <button onClick={() => setShowAssign(true)} className="flex-1 flex items-center justify-center gap-2 bg-acid-lime text-void rounded-md py-3 font-medium text-sm hover:brightness-90">
                Assign Authority
              </button>
              {complaint.status !== "CLOSED" && (
                <button onClick={() => handleAction("CLOSED", "Administrative closure following municipal review.")} disabled={isActing} className="flex-1 flex items-center justify-center gap-2 border border-graphite text-mist rounded-md py-3 font-normal text-sm hover:border-smoke disabled:opacity-70">
                  {isActing ? <Loader2 size={16} className="animate-spin" /> : "Close Ticket"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Repair Modal */}
      {showRepair && (
        <div className="fixed inset-0 bg-void/80 z-60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-carbon rounded-xl border border-graphite shadow-xl p-5 w-full max-w-md">
            <h3 className="font-medium text-paper mb-3">Upload Repair Evidence</h3>
            <label className="text-xs font-medium text-mist block mb-1">Repair Image URL (optional)</label>
            <input value={repairImageUrl} onChange={e => setRepairImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist mb-3 placeholder:text-fog focus:outline-none focus:border-mist" />
            <label className="text-xs font-medium text-mist block mb-1">Work Completion Notes *</label>
            <textarea value={repairNotes} onChange={e => setRepairNotes(e.target.value)} rows={3} placeholder="Describe the repair work completed..." className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist mb-3 placeholder:text-fog focus:outline-none focus:border-mist resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowRepair(false)} className="flex-1 border border-graphite rounded-md py-2.5 text-sm font-normal text-mist hover:border-smoke">Cancel</button>
              <button onClick={handleRepairSubmit} disabled={isActing || !repairNotes.trim()} className="flex-1 bg-acid-lime text-void rounded-md py-2.5 text-sm font-medium hover:brightness-90 disabled:opacity-70">
                {isActing ? "Submitting..." : "Submit & Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-void/80 z-60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-carbon rounded-xl border border-graphite shadow-xl p-5 w-full max-w-md">
            <h3 className="font-medium text-paper mb-3">Assign to Authority</h3>
            <label className="text-xs font-medium text-mist block mb-1">Select Authority</label>
            <select value={assignAuthId} onChange={e => setAssignAuthId(e.target.value)} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist mb-3 focus:outline-none focus:border-mist">
              <option value="">-- Select Authority --</option>
              {authorities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <label className="text-xs font-medium text-mist block mb-1">Notes (optional)</label>
            <textarea value={assignNotes} onChange={e => setAssignNotes(e.target.value)} rows={2} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist focus:outline-none focus:border-mist resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowAssign(false)} className="flex-1 border border-graphite rounded-md py-2.5 text-sm font-normal text-mist hover:border-smoke">Cancel</button>
              <button onClick={handleAssignSubmit} disabled={isActing || !assignAuthId} className="flex-1 bg-acid-lime text-void rounded-md py-2.5 text-sm font-medium hover:brightness-90 disabled:opacity-70">
                {isActing ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
