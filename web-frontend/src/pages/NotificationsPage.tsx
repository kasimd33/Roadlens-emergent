import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, CheckCheck, RefreshCw, Bell, BellOff, CheckCheck as CheckAll } from "lucide-react";
import { api } from "../api/client";
import { ComplaintDetailsModal } from "../components/ComplaintDetailsModal";
import type { Complaint, NotificationItem } from "../types";

function typeStyle(type: string): { Icon: typeof Bell; color: string; label: string } {
  switch (type) {
    case "ASSIGNMENT":
      return { Icon: GitBranch, color: "text-blue-700", label: "ASSIGNMENT" };
    case "RESOLUTION":
      return { Icon: CheckCheck, color: "text-green-600", label: "RESOLUTION" };
    case "STATUS_CHANGE":
      return { Icon: RefreshCw, color: "text-amber-600", label: "STATUS CHANGE" };
    default:
      return { Icon: Bell, color: "text-blue-700", label: type.replace("_", " ") };
  }
}

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
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
          <h1 className="text-xl font-black text-gray-800">Civic Notification Center</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time dispatch, lifecycle status &amp; resolution alerts
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1.5 bg-blue-100 text-blue-900 rounded-md px-2.5 py-1.5 text-[11px] font-bold hover:bg-blue-200 shrink-0"
          >
            <CheckAll size={14} /> Mark All Read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400 font-semibold">Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-gray-300 rounded-xl p-10 text-center bg-white mt-4">
          <BellOff size={44} className="text-gray-400 mx-auto" />
          <p className="text-[15px] font-bold text-gray-800 mt-2">No Notifications</p>
          <p className="text-xs text-gray-500 mt-1">
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
                    ? "bg-white border-gray-200 hover:border-gray-300"
                    : "bg-blue-50 border-blue-300 hover:border-blue-400"
                }`}
              >
                <span className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center shrink-0">
                  <Icon size={20} className={color} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 min-w-0 text-[13px] font-extrabold text-gray-800 truncate">
                      {n.title}
                    </p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed mt-0.5">{n.message}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] font-bold ${color}`}>{label}</span>
                    <span className="text-[10px] text-gray-400">
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
      />
    </div>
  );
};
