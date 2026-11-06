import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheck,
  Hand,
  Wrench,
  Camera,
  Building,
  User as UserIcon,
  Briefcase,
  CameraOff,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { ComplaintDetailsModal } from "../components/ComplaintDetailsModal";
import { RepairModal } from "../components/RepairModal";
import type { Complaint, Authority } from "../types";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1709934730506-fba12664d4e4";

function complaintImage(c: Complaint): string {
  if (c.image_url) return c.image_url;
  if (c.image_base64) {
    return c.image_base64.startsWith("data:")
      ? c.image_base64
      : `data:image/jpeg;base64,${c.image_base64}`;
  }
  return FALLBACK_IMG;
}

export const WorkspacePage: React.FC = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [activeRepairComplaint, setActiveRepairComplaint] = useState<Complaint | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: allComplaints = [], isLoading: complaintsLoading } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => api.getComplaints(),
  });

  const { data: authorities = [] } = useQuery({
    queryKey: ["authorities"],
    queryFn: () => api.getAuthorities(),
  });

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => api.getAdminUsers(),
    enabled: role === "ADMIN",
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes, repairBase64, repairUrl }: {
      id: string;
      status: string;
      notes?: string;
      repairBase64?: string;
      repairUrl?: string;
    }) =>
      api.updateComplaintStatus(id, {
        status,
        notes,
        repair_image_base64: repairBase64,
        repair_image_url: repairUrl,
      }),
    onSuccess: (updated) => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedComplaint(updated);
    },
    onError: (e: Error) => setActionError(e?.message || "Action failed."),
  });

  // Role-filtered complaints (same logic as the mobile app)
  const assignedToAuthority: Complaint[] = allComplaints.filter(
    (c) =>
      c.assigned_authority_id === user?.authority_id ||
      c.assigned_authority_name?.includes("Ballari") ||
      c.status === "ASSIGNED" ||
      c.status === "ACKNOWLEDGED" ||
      c.status === "IN_PROGRESS",
  );

  const citizenMyReports: Complaint[] = allComplaints.filter(
    (c) => c.user_id === user?.id || c.user_name?.includes(user?.username || ""),
  );

  const pipelineBtn =
    "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold text-white";

  return (
    <div className="space-y-5">
      {actionError && (
        <p className="text-xs font-semibold text-red-600 bg-red-100 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {actionError}
        </p>
      )}

      {/* ==================== AUTHORITY WORKSPACE ==================== */}
      {role === "AUTHORITY" && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-gray-800">Authority Field Workspace</h1>
              <p className="text-xs text-gray-500 mt-1">
                {user?.authority_name || "Ballari City Roads Authority"}
              </p>
            </div>
            <span className="bg-amber-500 text-white text-[11px] font-extrabold rounded-md px-2.5 py-1 whitespace-nowrap">
              {assignedToAuthority.length} Active Tickets
            </span>
          </div>

          <section>
            <h2 className="text-[15px] font-black text-gray-800 mb-2.5">Assigned Field Work Orders</h2>

            {complaintsLoading ? (
              <div className="py-10 text-center text-sm text-gray-400 font-semibold">Loading work orders…</div>
            ) : assignedToAuthority.length === 0 ? (
              <div className="border-[1.5px] border-dashed border-gray-300 rounded-xl p-10 text-center bg-white">
                <CheckCheck size={44} className="text-green-600 mx-auto" />
                <p className="text-[15px] font-bold text-gray-800 mt-2">All Work Orders Cleared!</p>
                <p className="text-xs text-gray-500 mt-1">
                  No pending road maintenance dispatched to your unit.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedToAuthority.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-gray-200 rounded-xl p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <SeverityBadge severity={c.severity} size="sm" />
                          <StatusBadge status={c.status} size="sm" />
                        </div>
                        <p className="text-sm font-bold text-gray-800 truncate">{c.title}</p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{c.location_name}</p>
                      </div>
                      <img
                        src={complaintImage(c)}
                        alt={c.title}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    </div>

                    {/* Pipeline actions */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-gray-200">
                      {c.status === "ASSIGNED" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: c.id,
                              status: "ACKNOWLEDGED",
                              notes: "Field lead acknowledged ticket and scheduled dispatch.",
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          className={`${pipelineBtn} bg-amber-500 hover:bg-amber-600 disabled:opacity-70`}
                        >
                          <Hand size={14} /> Acknowledge
                        </button>
                      )}
                      {(c.status === "ACKNOWLEDGED" || c.status === "ASSIGNED") && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: c.id,
                              status: "IN_PROGRESS",
                              notes: "Maintenance crew arrived with equipment.",
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          className={`${pipelineBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-70`}
                        >
                          <Wrench size={14} /> Start Work
                        </button>
                      )}
                      {c.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => setActiveRepairComplaint(c)}
                          className={`${pipelineBtn} bg-green-600 hover:bg-green-700`}
                        >
                          <Camera size={14} /> Upload Proof &amp; Resolve
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedComplaint(c)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        Full Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== ADMIN GOVERNANCE ==================== */}
      {role === "ADMIN" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-black text-gray-800">City Governance Dashboard</h1>
            <p className="text-xs text-gray-500 mt-1">Municipal Overview &amp; Authority Dispatching</p>
          </div>

          {/* Authorities directory */}
          <section>
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <h2 className="text-[15px] font-black text-gray-800">
                Municipal Authority Divisions ({authorities.length})
              </h2>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {authorities.map((auth: Authority) => (
                <div key={auth.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building size={18} className="text-blue-700" />
                    <span className="text-[11px] font-extrabold text-blue-700">{auth.code}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{auth.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Zone: {auth.zone}</p>
                  <p className="text-[10px] text-gray-500 truncate">Area: {auth.coverage_area}</p>
                  <div className="flex gap-3 mt-2 pt-1.5 border-t border-gray-100">
                    <span className="text-[11px] font-bold text-amber-600">
                      Active: {auth.active_complaints_count || 0}
                    </span>
                    <span className="text-[11px] font-bold text-green-600">
                      Resolved: {auth.resolved_count || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Registered users */}
          <section>
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <h2 className="text-[15px] font-black text-gray-800">
                Registered User Directory ({adminUsers.length})
              </h2>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
              {adminUsers.map((u: { id: string; username: string; full_name?: string; role: string }) => (
                <div key={u.id} className="flex items-center p-2.5">
                  <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <UserIcon size={14} className="text-blue-700" />
                  </span>
                  <div className="flex-1 min-w-0 mx-2">
                    <p className="text-[13px] font-bold text-gray-800 truncate">
                      {u.full_name || u.username}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{u.username}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ==================== CITIZEN VIEW ==================== */}
      {role === "USER" && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-black text-gray-800">Citizen Dashboard &amp; Reports</h1>
            <p className="text-xs text-gray-500 mt-1">
              Track issues you have reported across the city
            </p>
          </div>

          <section>
            <h2 className="text-[15px] font-black text-gray-800 mb-2.5">
              My Reported Road Damage ({citizenMyReports.length})
            </h2>

            {complaintsLoading ? (
              <div className="py-10 text-center text-sm text-gray-400 font-semibold">Loading your reports…</div>
            ) : citizenMyReports.length === 0 ? (
              <div className="border-[1.5px] border-dashed border-gray-300 rounded-xl p-10 text-center bg-white">
                <CameraOff size={44} className="text-gray-400 mx-auto" />
                <p className="text-[15px] font-bold text-gray-800 mt-2">No Reports Filed Yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Use the Inspect page to scan road damage and submit civic tickets.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {citizenMyReports.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-left hover:border-blue-400 transition-colors h-[110px]"
                  >
                    <img
                      src={complaintImage(c)}
                      alt={c.title}
                      className="w-[110px] h-[110px] object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <SeverityBadge severity={c.severity} size="sm" />
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <p className="text-[13px] font-bold text-gray-800 truncate">{c.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">{c.location_name}</p>
                      <p className="text-[11px] font-semibold text-blue-700 truncate">
                        <Briefcase size={12} className="inline mr-1 -mt-0.5" />
                        {c.assigned_authority_name ? "Nearby Field Officers" : "Awaiting Dispatch"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Complaint details */}
      <ComplaintDetailsModal
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onStatusUpdate={async (status, notes, repairBase64, repairUrl) => {
          if (selectedComplaint) {
            await updateStatusMutation.mutateAsync({
              id: selectedComplaint.id,
              status,
              notes,
              repairBase64,
              repairUrl,
            });
          }
        }}
      />

      {/* Authority quick repair */}
      {activeRepairComplaint && (
        <RepairModal
          complaintId={activeRepairComplaint.id}
          complaintTitle={activeRepairComplaint.title}
          onClose={() => setActiveRepairComplaint(null)}
          onSubmit={async (data) => {
            await updateStatusMutation.mutateAsync({
              id: activeRepairComplaint.id,
              status: "RESOLVED",
              notes: data.notes,
              repairBase64: data.repairImageBase64,
              repairUrl: data.repairImageUrl,
            });
            setActiveRepairComplaint(null);
          }}
        />
      )}
    </div>
  );
};
