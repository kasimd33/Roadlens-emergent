import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheck,
  Hand,
  Wrench,
  Camera,
  GitBranch,
  Building,
  Trash2,
  CheckCircle,
  Plus,
  UserPlus,
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
import { AssignModal } from "../components/AssignModal";
import { CreateAuthorityUserModal } from "../components/CreateAuthorityUserModal";
import { CreateAuthorityDepartmentModal } from "../components/CreateAuthorityDepartmentModal";
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
  const [activeAssignComplaint, setActiveAssignComplaint] = useState<Complaint | null>(null);
  const [showCreateAuthority, setShowCreateAuthority] = useState(false);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const deleteAuthorityMutation = useMutation({
    mutationFn: (id: string) => api.deleteAuthority(id),
    onSuccess: () => {
      setDeptError(null);
      queryClient.invalidateQueries({ queryKey: ["authorities"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (e: Error) => setDeptError(e?.message || "Could not remove department."),
  });

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

  const assignMutation = useMutation({
    mutationFn: ({ id, authorityId, notes }: { id: string; authorityId: string; notes: string }) =>
      api.assignComplaint(id, { authority_id: authorityId, notes }),
    onSuccess: (updated) => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["authorities"] });
      setSelectedComplaint(updated);
    },
    onError: (e: Error) => setActionError(e?.message || "Assignment failed."),
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

  const unassignedComplaints: Complaint[] = allComplaints.filter(
    (c) => !c.assigned_authority_id || c.status === "SUBMITTED",
  );

  const citizenMyReports: Complaint[] = allComplaints.filter(
    (c) => c.user_id === user?.id || c.user_name?.includes(user?.username || ""),
  );

  const pipelineBtn =
    "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium";

  return (
    <div className="space-y-5">
      {actionError && (
        <p className="text-xs font-medium text-coral-red bg-coral-red/10 border border-coral-red/30 rounded-md px-3 py-2" role="alert">
          {actionError}
        </p>
      )}

      {/* ==================== AUTHORITY WORKSPACE ==================== */}
      {role === "AUTHORITY" && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-medium text-paper tracking-[-0.012em]">Authority Field Workspace</h1>
              <p className="text-xs text-fog mt-1">
                {user?.authority_name || "Central Ballari Roads & Works Division"}
              </p>
            </div>
            <span className="bg-white/[0.05] text-mist text-[11px] font-medium rounded-full px-2.5 py-1 whitespace-nowrap">
              {assignedToAuthority.length} Active Tickets
            </span>
          </div>

          <section>
            <h2 className="text-[15px] font-medium text-paper mb-2.5">Assigned Field Work Orders</h2>

            {complaintsLoading ? (
              <div className="py-10 text-center text-sm text-fog font-medium">Loading work orders…</div>
            ) : assignedToAuthority.length === 0 ? (
              <div className="border border-dashed border-smoke bg-white/[0.02] rounded-xl p-10 text-center">
                <CheckCheck size={44} className="text-ash mx-auto" />
                <p className="text-[15px] font-medium text-paper mt-2">All Work Orders Cleared!</p>
                <p className="text-xs text-fog mt-1">
                  No pending road maintenance dispatched to your unit.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedToAuthority.map((c) => (
                  <div
                    key={c.id}
                    className="bg-carbon border border-graphite rounded-xl p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <SeverityBadge severity={c.severity} size="sm" />
                          <StatusBadge status={c.status} size="sm" />
                        </div>
                        <p className="text-sm font-medium text-paper truncate">{c.title}</p>
                        <p className="text-[11px] text-fog truncate mt-0.5">{c.location_name}</p>
                      </div>
                      <img
                        src={complaintImage(c)}
                        alt={c.title}
                        className="w-16 h-16 rounded-md object-cover shrink-0"
                      />
                    </div>

                    {/* Pipeline actions */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-graphite">
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
                          className={`${pipelineBtn} border border-graphite text-mist hover:border-smoke disabled:opacity-70`}
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
                          className={`${pipelineBtn} bg-acid-lime text-void hover:brightness-90 disabled:opacity-70`}
                        >
                          <Wrench size={14} /> Start Work
                        </button>
                      )}
                      {c.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => setActiveRepairComplaint(c)}
                          className={`${pipelineBtn} bg-paper text-void hover:brightness-90 rounded-full`}
                        >
                          <Camera size={14} /> Upload Proof &amp; Resolve
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedComplaint(c)}
                        className="rounded-md border border-graphite px-3 py-2 text-xs font-medium text-mist hover:border-smoke"
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
            <h1 className="text-xl font-medium text-paper tracking-[-0.012em]">City Governance Dashboard</h1>
            <p className="text-xs text-fog mt-1">Municipal Overview &amp; Authority Dispatching</p>
          </div>

          {/* Unassigned dispatch queue */}
          <section>
            <h2 className="text-[15px] font-medium text-paper mb-2.5">
              Unassigned / Pending Dispatch ({unassignedComplaints.length})
            </h2>

            {unassignedComplaints.length === 0 ? (
              <div className="flex items-center gap-2 border border-graphite rounded-xl p-3 bg-carbon">
                <CheckCircle size={24} className="text-pulse-green shrink-0" />
                <p className="text-xs text-fog">
                  All current complaints are assigned to municipal authorities.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {unassignedComplaints.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 bg-carbon border border-graphite rounded-xl p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <SeverityBadge severity={c.severity} size="sm" />
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <p className="text-sm font-medium text-paper truncate">{c.title}</p>
                      <p className="text-[11px] text-fog truncate mt-0.5">{c.location_name}</p>
                    </div>
                    <button
                      onClick={() => setActiveAssignComplaint(c)}
                      className="flex items-center gap-1 bg-acid-lime text-void rounded-md px-3 py-2 text-xs font-medium hover:brightness-90 shrink-0"
                    >
                      <GitBranch size={14} /> Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Authorities directory */}
          <section>
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <h2 className="text-[15px] font-medium text-paper">
                Municipal Authority Divisions ({authorities.length})
              </h2>
              <button
                onClick={() => setShowCreateDept(true)}
                className="flex items-center gap-1 bg-acid-lime text-void rounded-md px-2.5 py-1.5 text-xs font-medium hover:brightness-90 shrink-0"
              >
                <Plus size={16} /> Add Department
              </button>
            </div>

            {deptError && (
              <p className="text-xs font-medium text-coral-red bg-coral-red/10 border border-coral-red/30 rounded-md px-3 py-2 mb-2.5" role="alert">
                {deptError}
              </p>
            )}

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {authorities.map((auth: Authority) => (
                <div key={auth.id} className="bg-carbon border border-graphite rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building size={18} className="text-ash" />
                    <span className="text-[11px] font-medium text-fog font-berkeley-mono">{auth.code}</span>
                    <button
                      onClick={() => deleteAuthorityMutation.mutate(auth.id)}
                      className="ml-auto p-1 text-fog hover:bg-obsidian rounded-md"
                      aria-label={`Delete ${auth.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-paper">{auth.name}</p>
                  <p className="text-[11px] text-fog mt-0.5">Zone: {auth.zone}</p>
                  <p className="text-[10px] text-fog truncate">Area: {auth.coverage_area}</p>
                  <div className="flex gap-3 mt-2 pt-1.5 border-t border-graphite">
                    <span className="text-[11px] font-medium text-acid-lime">
                      Active: {auth.active_complaints_count || 0}
                    </span>
                    <span className="text-[11px] font-medium text-paper">
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
              <h2 className="text-[15px] font-medium text-paper">
                Registered User Directory ({adminUsers.length})
              </h2>
              <button
                onClick={() => setShowCreateAuthority(true)}
                className="flex items-center gap-1 bg-acid-lime text-void rounded-md px-2.5 py-1.5 text-xs font-medium hover:brightness-90 shrink-0"
              >
                <UserPlus size={14} /> Add Authority
              </button>
            </div>

            <div className="bg-carbon border border-graphite rounded-xl overflow-hidden divide-y divide-graphite">
              {adminUsers.map((u: { id: string; username: string; full_name?: string; role: string }) => (
                <div key={u.id} className="flex items-center p-2.5">
                  <span className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
                    <UserIcon size={14} className="text-ash" />
                  </span>
                  <div className="flex-1 min-w-0 mx-2">
                    <p className="text-[13px] font-medium text-paper truncate">
                      {u.full_name || u.username}
                    </p>
                    <p className="text-[11px] text-fog truncate">{u.username}</p>
                  </div>
                  <span className="bg-white/[0.05] text-fog text-[10px] font-medium px-2 py-0.5 rounded-[4px] shrink-0">
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
            <h1 className="text-xl font-medium text-paper tracking-[-0.012em]">Citizen Dashboard &amp; Reports</h1>
            <p className="text-xs text-fog mt-1">
              Track issues you have reported across the city
            </p>
          </div>

          <section>
            <h2 className="text-[15px] font-medium text-paper mb-2.5">
              My Reported Road Damage ({citizenMyReports.length})
            </h2>

            {complaintsLoading ? (
              <div className="py-10 text-center text-sm text-fog font-medium">Loading your reports…</div>
            ) : citizenMyReports.length === 0 ? (
              <div className="border border-dashed border-smoke bg-white/[0.02] rounded-xl p-10 text-center">
                <CameraOff size={44} className="text-ash mx-auto" />
                <p className="text-[15px] font-medium text-paper mt-2">No Reports Filed Yet</p>
                <p className="text-xs text-fog mt-1">
                  Use the Inspect page to scan road damage and submit civic tickets.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {citizenMyReports.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className="flex bg-carbon border border-graphite rounded-xl overflow-hidden text-left hover:border-smoke transition-colors h-[110px]"
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
                      <p className="text-[13px] font-medium text-paper truncate">{c.title}</p>
                      <p className="text-[11px] text-fog truncate">{c.location_name}</p>
                      <p className="text-[11px] font-medium text-mist truncate">
                        <Briefcase size={12} className="inline mr-1 -mt-0.5" />
                        {c.assigned_authority_name || "Awaiting Dispatch"}
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
        authorities={authorities}
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
        onAssign={async (authorityId, notes) => {
          if (selectedComplaint) {
            await assignMutation.mutateAsync({ id: selectedComplaint.id, authorityId, notes });
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

      {/* Admin quick assign */}
      {activeAssignComplaint && (
        <AssignModal
          complaintId={activeAssignComplaint.id}
          complaintTitle={activeAssignComplaint.title}
          authorities={authorities}
          currentAssignedId={activeAssignComplaint.assigned_authority_id}
          onClose={() => setActiveAssignComplaint(null)}
          onAssign={async (authId, notes) => {
            await assignMutation.mutateAsync({
              id: activeAssignComplaint.id,
              authorityId: authId,
              notes,
            });
            setActiveAssignComplaint(null);
          }}
        />
      )}

      {/* Admin: create authority login */}
      <CreateAuthorityUserModal
        visible={showCreateAuthority}
        onClose={() => setShowCreateAuthority(false)}
        authorities={authorities}
      />

      {/* Admin: create authority department */}
      <CreateAuthorityDepartmentModal
        visible={showCreateDept}
        onClose={() => setShowCreateDept(false)}
      />
    </div>
  );
};
