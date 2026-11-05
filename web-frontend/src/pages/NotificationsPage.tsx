import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, CheckCheck, RefreshCw, Bell, BellOff, CheckCheck as CheckAll } from "lucide-react";
import { api } from "../api/client";
import { ComplaintDetailsModal } from "../components/ComplaintDetailsModal";
import type { Complaint, NotificationItem } from "../types";

function typeStyle(type: string): { Icon: typeof Bell; color: string; label: string } {
  switch (type) {
    case "ASSIGNMENT":
      return { Icon: GitBranch, color: "text-mist", label: "ASSIGNMENT" };
    case "RESOLUTION":
      return { Icon: CheckCheck, color: "text-pulse-green", label: "RESOLUTION" };
    case "STATUS_CHANGE":
      return { Icon: RefreshCw, color: "text-fog", label: "STATUS CHANGE" };
    default:
      return { Icon: Bell, color: "text-mist", label: type.replace("_", " ") };
  }
}

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
  });

  const { data: authorities = [] } = useQuery({
    queryKey: ["authorities"],
    queryFn: () => api.getAuthorities(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    if (item.complaint_id) {
      try {
        setSelectedComplaint(await api.getComplaint(item.complaint_id));
      } catch (e) {
        console.warn("Could not fetch complaint details:", e);
      }
    }
  };

  const unreadCount = notifications.filter((n: NotificationItem) => !n.read).length;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-paper tracking-[-0.012em]">Civic Notification Center</h1>
          <p className="text-xs text-fog mt-1">
            Real-time dispatch, lifecycle status &amp; resolution alerts
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1.5 border border-graphite text-mist rounded-md px-2.5 py-1.5 text-[11px] font-medium hover:border-smoke shrink-0"
          >
            <CheckAll size={14} /> Mark All Read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-fog font-medium">Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <div className="border border-dashed border-smoke bg-white/[0.02] rounded-xl p-10 text-center mt-4">
          <BellOff size={44} className="text-ash mx-auto" />
          <p className="text-[15px] font-medium text-paper mt-2">No Notifications</p>
          <p className="text-xs text-fog mt-1">
            You&apos;re completely up to date with civic maintenance updates.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n: NotificationItem) => {
            const { Icon, color, label } = typeStyle(n.notification_type);
            return (
              <button
                key={n.id}
                onClick={() => handleNotificationPress(n)}
                className={`w-full flex items-start gap-3 border rounded-xl p-3 text-left transition-colors ${
                  n.read
                    ? "bg-carbon border-graphite hover:border-smoke"
                    : "bg-obsidian border-graphite hover:border-smoke"
                }`}
              >
                <span className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
                  <Icon size={20} className={color} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 min-w-0 text-[13px] font-medium text-paper truncate">
                      {n.title}
                    </p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-acid-lime shrink-0" />}
                  </div>
                  <p className="text-xs text-mist leading-relaxed mt-0.5">{n.message}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] font-semibold ${color}`}>{label}</span>
                    <span className="text-[10px] text-ash">
                      {new Date(n.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ComplaintDetailsModal
        complaint={selectedComplaint}
        authorities={authorities}
        onClose={() => setSelectedComplaint(null)}
        onStatusUpdate={async (status, notes, repairBase64, repairUrl) => {
          if (selectedComplaint) {
            await api.updateComplaintStatus(String(selectedComplaint.id), {
              status,
              notes,
              repair_image_base64: repairBase64,
              repair_image_url: repairUrl,
            });
            queryClient.invalidateQueries({ queryKey: ["complaints"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            setSelectedComplaint(await api.getComplaint(String(selectedComplaint.id)));
          }
        }}
        onAssign={async (authorityId, notes) => {
          if (selectedComplaint) {
            await api.assignComplaint(String(selectedComplaint.id), {
              authority_id: authorityId,
              notes,
            });
            queryClient.invalidateQueries({ queryKey: ["complaints"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            setSelectedComplaint(await api.getComplaint(String(selectedComplaint.id)));
          }
        }}
      />
    </div>
  );
};
