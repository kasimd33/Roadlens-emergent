import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api/client";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { DemoRoleBanner } from "@/src/components/DemoRoleBanner";
import { ComplaintDetailsModal } from "@/src/components/ComplaintDetailsModal";
import { NotificationItem, Complaint } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Notifications Query
  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
  });

  const { data: authorities = [] } = useQuery({
    queryKey: ["authorities"],
    queryFn: () => api.getAuthorities(),
  });

  // Mark all read mutation
  const markAllMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark single read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    if (item.complaint_id) {
      try {
        const c = await api.getComplaint(item.complaint_id);
        setSelectedComplaint(c);
      } catch (e) {
        console.warn("Could not fetch complaint details:", e);
      }
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "ASSIGNMENT":
        return { name: "git-branch", color: colors.brandPrimary };
      case "RESOLUTION":
        return { name: "checkmark-done-circle", color: colors.success };
      case "STATUS_CHANGE":
        return { name: "sync-circle", color: colors.warning };
      default:
        return { name: "notifications", color: colors.brandPrimary };
    }
  };

  const unreadCount = notifications.filter((n: NotificationItem) => !n.read).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      {/* Top Safe Area Container + Role Switcher */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.brand }}>
        <DemoRoleBanner />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.onSurfaceSecondary }]}>
              Civic Notification Center
            </Text>
            <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
              Real-time dispatch, lifecycle status & resolution alerts
            </Text>
          </View>

          {unreadCount > 0 && (
            <Pressable
              testID="mark-all-notifications-read-btn"
              onPress={() => markAllMutation.mutate()}
              style={[styles.markAllBtn, { backgroundColor: colors.brandTertiary }]}
            >
              <Text style={[styles.markAllText, { color: colors.onBrandTertiary }]}>
                Mark All Read
              </Text>
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.brandPrimary} style={{ marginVertical: 32 }} />
        ) : notifications.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="notifications-off-outline" size={44} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.onSurfaceSecondary }]}>
              No Notifications
            </Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              You're completely up to date with civic maintenance updates.
            </Text>
          </View>
        ) : (
          <View style={styles.notificationList}>
            {notifications.map((n: NotificationItem) => {
              const icon = getIconForType(n.notification_type);
              return (
                <Pressable
                  key={n.id}
                  testID={`notification-item-${n.id}`}
                  onPress={() => handleNotificationPress(n)}
                  style={[
                    styles.notificationCard,
                    {
                      backgroundColor: n.read ? colors.surfaceSecondary : "#EFF6FF",
                      borderColor: n.read ? colors.border : colors.brandSecondary,
                    },
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: `${icon.color}15` }]}>
                    <Ionicons name={icon.name as any} size={20} color={icon.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.notifTitle, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      {!n.read && <View style={styles.unreadDot} />}
                    </View>

                    <Text style={[styles.notifMessage, { color: colors.onSurfaceTertiary }]}>
                      {n.message}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <Text style={[styles.notifType, { color: icon.color }]}>
                        {n.notification_type.replace("_", " ")}
                      </Text>
                      <Text style={[styles.notifTime, { color: colors.muted }]}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Complaint Details Modal */}
      <ComplaintDetailsModal
        visible={!!selectedComplaint}
        complaint={selectedComplaint}
        authorities={authorities}
        onClose={() => setSelectedComplaint(null)}
        onStatusUpdate={async (status, notes, repairBase64, repairUrl) => {
          if (selectedComplaint) {
            await api.updateComplaintStatus(selectedComplaint.id, {
              status,
              notes,
              repair_image_base64: repairBase64,
              repair_image_url: repairUrl,
            });
            queryClient.invalidateQueries({ queryKey: ["complaints"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            const updated = await api.getComplaint(selectedComplaint.id);
            setSelectedComplaint(updated);
          }
        }}
        onAssign={async (authorityId, notes) => {
          if (selectedComplaint) {
            await api.assignComplaint(selectedComplaint.id, {
              authority_id: authorityId,
              notes,
            });
            queryClient.invalidateQueries({ queryKey: ["complaints"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            const updated = await api.getComplaint(selectedComplaint.id);
            setSelectedComplaint(updated);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollBody: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: "700",
  },
  notificationList: {
    gap: 10,
  },
  notificationCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginLeft: 6,
  },
  notifMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginVertical: 2,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  notifType: {
    fontSize: 10,
    fontWeight: "700",
  },
  notifTime: {
    fontSize: 10,
  },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
  },
});
