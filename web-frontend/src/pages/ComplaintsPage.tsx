import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, XCircle, MapPin, Building2, SearchX } from "lucide-react";
import { api } from "../api/client";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { ComplaintDetailsModal } from "../components/ComplaintDetailsModal";
import type { Complaint } from "../types";

const STATUS_FILTERS = [
  "ALL",
  "SUBMITTED",
  "ASSIGNED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

const SEVERITY_FILTERS = ["ALL", "HIGH", "MEDIUM", "LOW"];

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

export const ComplaintsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["complaints", statusFilter, severityFilter, searchQuery],
    queryFn: () =>
      api.getComplaints({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        severity: severityFilter !== "ALL" ? severityFilter : undefined,
        search: searchQuery || undefined,
      }),
  });

  const { data: authorities = [] } = useQuery({
    queryKey: ["authorities"],
    queryFn: () => api.getAuthorities(),
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-gray-800">Civic Complaint Tracker</h1>
        <p className="text-xs text-gray-500 mt-1">
          Real-time municipal lifecycle: SUBMITTED → CLOSED
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center border border-gray-300 bg-white rounded-lg px-3 py-2">
        <Search size={18} className="text-gray-400 mr-2 shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by street, damage type, or keyword..."
          className="flex-1 text-[13px] outline-none bg-transparent text-gray-900 min-w-0"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="p-1 text-gray-400 hover:text-gray-600">
            <XCircle size={16} />
          </button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_FILTERS.map((s) => {
          const isSelected = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 h-9 rounded-full border px-3.5 text-xs font-bold transition-colors ${
                isSelected
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-gray-300 bg-white text-gray-800 hover:border-gray-400"
              }`}
            >
              {s === "ALL" ? "All Statuses" : s.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* Severity filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {SEVERITY_FILTERS.map((sev) => {
          const isSelected = severityFilter === sev;
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`shrink-0 h-9 rounded-full border px-3.5 text-xs font-bold transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-100 text-blue-900"
                  : "border-gray-300 bg-white text-gray-800 hover:border-gray-400"
              }`}
            >
              {sev === "ALL" ? "All Severities" : `${sev} Severity`}
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400 font-semibold">Loading complaints…</div>
      ) : complaints.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-gray-300 rounded-xl p-10 text-center bg-white mt-4">
          <SearchX size={44} className="text-gray-400 mx-auto" />
          <p className="text-[15px] font-bold text-gray-800 mt-2">No Complaints Match Filters</p>
          <p className="text-xs text-gray-500 mt-1">
            Try selecting a different status filter or clearing your search query.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {complaints.map((item: Complaint) => (
            <button
              key={item.id}
              onClick={() => setSelectedComplaint(item)}
              className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-left hover:border-blue-400 hover:shadow-sm transition-all h-[114px]"
            >
              <img
                src={complaintImage(item)}
                alt={item.title}
                className="w-[114px] h-[114px] object-cover shrink-0"
              />
              <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <SeverityBadge severity={item.severity} size="sm" />
                  <StatusBadge status={item.status} size="sm" />
                </div>
                <p className="text-[13px] font-extrabold text-gray-800 truncate">{item.title}</p>
                <div className="flex items-center min-w-0">
                  <MapPin size={12} className="text-gray-400 mr-1 shrink-0" />
                  <span className="text-[11px] text-gray-500 truncate">{item.location_name}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center min-w-0 text-[10px] font-bold text-blue-700">
                    <Building2 size={12} className="mr-1 shrink-0" />
                    <span className="truncate">{item.assigned_authority_name || "Unassigned"}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
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
