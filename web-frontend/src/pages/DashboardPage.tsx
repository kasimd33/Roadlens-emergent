import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileStack,
  Hammer,
  CheckCheck,
  AlertCircle,
  Scan,
  GitFork,
  Briefcase,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { ComplaintDetailsModal } from "../components/ComplaintDetailsModal";
import { AuthorityLoginAlert } from "../components/AuthorityLoginAlert";
import type { Complaint } from "../types";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1709934730506-fba12664d4e4";

function complaintImage(c: Complaint): string {
  if (c.image_url) return c.image_url;
  if (c.image_base64) {
    return c.image_base64.startsWith("data:")
      ? c.image_base64
      : `data:image/jpeg;base64,${c.image_base64}`;
  }
  return FALLBACK_IMG;
}

export const DashboardPage: React.FC = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => api.getAdminStats(),
  });

  const { data: complaints = [], isLoading: complaintsLoading } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => api.getComplaints(),
  });

  const { data: authorities = [] } = useQuery({
    queryKey: ["authorities"],
    queryFn: () => api.getAuthorities(),
  });

  // Authority login alert: HIGH-severity dispatches assigned to this division.
  // Shown once per login (dismissal is keyed to the session's login marker).
  const isAuthority = role === "AUTHORITY";
  const { data: highAssigned = [] } = useQuery({
    queryKey: ["authorityHighAlert"],
    queryFn: () => api.getComplaints({ severity: "HIGH", assigned_to_me: true }),
    enabled: isAuthority,
  });
  const loginId = sessionStorage.getItem("roadlens_login_id") || "";
  const alertDismissedFor = sessionStorage.getItem("roadlens_auth_alert_dismissed") || "";
  const showLoginAlert =
    isAuthority && !alertDismissed && highAssigned.length > 0 && alertDismissedFor !== loginId;

  const dismissLoginAlert = () => {
    sessionStorage.setItem("roadlens_auth_alert_dismissed", loginId);
    setAlertDismissed(true);
  };

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
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedComplaint(updated);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, authorityId, notes }: { id: string; authorityId: string; notes: string }) =>
      api.assignComplaint(id, { authority_id: authorityId, notes }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["authorities"] });
      setSelectedComplaint(updated);
    },
  });

  const recentComplaints: Complaint[] = complaints.slice(0, 6);

  const statCards = [
    {
      Icon: FileStack,
      value: stats?.total_complaints ?? 0,
      label: "Total Reported",
      emphasize: false,
      loading: statsLoading,
    },
    {
      Icon: Hammer,
      value: stats?.by_status?.IN_PROGRESS ?? 0,
      label: "In Progress",
      emphasize: false,
      loading: statsLoading,
    },
    {
      Icon: CheckCheck,
      value: `${stats?.resolution_rate_percent ?? 0}%`,
      label: "Resolution Rate",
      emphasize: false,
      loading: statsLoading,
    },
    {
      Icon: AlertCircle,
      value: stats?.by_severity?.HIGH ?? 0,
      label: "High Severity",
      emphasize: true,
      loading: statsLoading,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <section className="bg-obsidian rounded-xl p-6 md:p-8">
        <p className="text-fog text-xs font-medium uppercase tracking-widest">
          Municipal Road Health
        </p>
        <h1 className="text-paper text-2xl md:text-3xl font-medium tracking-[-0.012em] mt-1">AI Road Damage Scanner</h1>
        <p className="text-mist text-sm mt-2 max-w-2xl leading-relaxed">
          Detect potholes, cracks &amp; surface degradation with GPT-5.4 Vision in real time.
        </p>
        <Link
          to="/inspect"
          className="inline-flex items-center gap-2 bg-acid-lime text-void font-medium text-sm rounded-md px-4 py-3 mt-5 hover:brightness-90 transition-all"
        >
          <Scan size={18} />
          New AI Inspection
        </Link>
      </section>

      {/* Stats grid */}
      <section>
        <h2 className="text-base font-medium text-paper mb-3">Civic Infrastructure Metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(({ Icon, value, label, emphasize, loading }) => (
            <div key={label} className="bg-carbon border border-graphite rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <Icon size={20} className={emphasize ? "text-coral-red" : "text-ash"} />
                <span className="text-xl font-medium text-paper">
                  {loading ? "…" : value}
                </span>
              </div>
              <p className="text-xs font-normal text-fog">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-base font-medium text-paper mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link
            to="/inspect"
            className="bg-carbon border border-graphite rounded-xl p-4 flex flex-col items-center hover:border-smoke transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center mb-2">
              <AlertCircle size={20} className="text-mist" />
            </span>
            <span className="text-xs font-medium text-mist">Scan Pothole</span>
            <span className="text-[10px] text-ash mt-0.5">AI Camera</span>
          </Link>
          <Link
            to="/complaints"
            className="bg-carbon border border-graphite rounded-xl p-4 flex flex-col items-center hover:border-smoke transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center mb-2">
              <GitFork size={20} className="text-mist" />
            </span>
            <span className="text-xs font-medium text-mist">Track Status</span>
            <span className="text-[10px] text-ash mt-0.5">6 Stages</span>
          </Link>
          <Link
            to={role === "USER" ? "/complaints" : "/workspace"}
            className="bg-carbon border border-graphite rounded-xl p-4 flex flex-col items-center hover:border-smoke transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center mb-2">
              <Briefcase size={20} className="text-mist" />
            </span>
            <span className="text-xs font-medium text-mist">Workspace</span>
            <span className="text-[10px] text-ash mt-0.5">{role}</span>
          </Link>
        </div>
      </section>

      {/* Recent reports feed */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-paper">Recent Civic Reports</h2>
          <Link
            to="/complaints"
            className="flex items-center text-[13px] font-normal text-mist underline hover:text-paper"
          >
            View All <ChevronRight size={14} />
          </Link>
        </div>

        {complaintsLoading ? (
          <div className="py-12 text-center text-sm text-fog font-normal">Loading reports…</div>
        ) : recentComplaints.length === 0 ? (
          <div className="border border-dashed border-graphite rounded-xl p-10 text-center bg-carbon">
            <ShieldCheck size={40} className="text-ash mx-auto" />
            <p className="text-[15px] font-medium text-paper mt-2">No Active Damage Reports</p>
            <p className="text-xs text-fog mt-1">
              All municipal road sectors are currently clear.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recentComplaints.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedComplaint(item)}
                className="flex bg-carbon border border-graphite rounded-xl overflow-hidden text-left hover:border-smoke transition-colors h-[110px]"
              >
                <img
                  src={complaintImage(item)}
                  alt={item.title}
                  className="w-[110px] h-[110px] object-cover shrink-0"
                />
                <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={item.severity} size="sm" />
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <p className="text-[13px] font-medium text-paper truncate">{item.title}</p>
                  <div className="flex items-center min-w-0">
                    <MapPin size={12} className="text-ash mr-1 shrink-0" />
                    <span className="text-[11px] text-fog truncate">{item.location_name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center min-w-0 text-[10px] font-normal text-fog">
                      <Building2 size={12} className="mr-1 shrink-0" />
                      <span className="truncate">{item.assigned_authority_name || "Unassigned"}</span>
                    </span>
                    <span className="text-[10px] text-ash shrink-0">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <AuthorityLoginAlert
        open={showLoginAlert}
        complaints={highAssigned}
        onClose={dismissLoginAlert}
        onSelect={(complaint) => {
          dismissLoginAlert();
          setSelectedComplaint(complaint);
        }}
      />

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
    </div>
  );
};
