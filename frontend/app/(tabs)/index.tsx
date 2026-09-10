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
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api/client";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { DemoRoleBanner } from "@/src/components/DemoRoleBanner";
import { SeverityBadge } from "@/src/components/SeverityBadge";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ComplaintDetailsModal } from "@/src/components/ComplaintDetailsModal";
import { Complaint } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => api.getAdminStats(),
  });

  const {
    data: complaints,
    isLoading: complaintsLoading,
    refetch: refetchComplaints,
  } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => api.getComplaints(),
  });

  const { data: authorities = [] } = useQuery({
    queryKey: ["authorities"],
    queryFn: () => api.getAuthorities(),
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
      repairBase64,
      repairUrl,
    }: {
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

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchComplaints()]);
    setRefreshing(false);
  };

  const recentComplaints: Complaint[] = (complaints || []).slice(0, 6);

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
        {/* Welcome Civic Banner */}
        <View style={[styles.heroCard, { backgroundColor: colors.brand }]}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroGreeting}>Municipal Road Health</Text>
            <Text style={styles.heroTitle}>AI Road Damage Scanner</Text>
            <Text style={styles.heroSub}>
              Detect potholes, cracks & surface degradation with GPT-5.4 Vision in real time.
            </Text>
          </View>

          <Pressable
            testID="start-inspection-cta-btn"
            onPress={() => router.push("/(tabs)/inspect")}
            style={({ pressed }) => [
              styles.heroCtaBtn,
              { backgroundColor: "#FFFFFF", opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="scan" size={18} color={colors.brand} style={{ marginRight: 6 }} />
            <Text style={[styles.heroCtaText, { color: colors.brand }]}>New AI Inspection</Text>
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionHeading, { color: colors.onSurfaceSecondary }]}>
            Civic Infrastructure Metrics
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.statIconRow}>
                <Ionicons name="documents-outline" size={20} color={colors.brandPrimary} />
                <Text style={[styles.statValue, { color: colors.onSurfaceSecondary }]}>
                  {stats?.total_complaints ?? 3}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Total Reported</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.statIconRow}>
                <Ionicons name="hammer-outline" size={20} color={colors.warning} />
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {stats?.by_status?.IN_PROGRESS ?? 1}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.muted }]}>In Progress</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.statIconRow}>
                <Ionicons name="checkmark-done-circle-outline" size={20} color={colors.success} />
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {stats?.resolution_rate_percent ?? 66.7}%
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Resolution Rate</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.statIconRow}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
                <Text style={[styles.statValue, { color: colors.error }]}>
                  {stats?.by_severity?.HIGH ?? 1}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.muted }]}>High Severity</Text>
            </View>
          </View>
        </View>

        {/* Quick Inspection Shortcuts */}
        <View style={styles.shortcutsSection}>
          <Text style={[styles.sectionHeading, { color: colors.onSurfaceSecondary }]}>
            Quick Actions
          </Text>
          <View style={styles.shortcutRow}>
            <Pressable
              testID="shortcut-scan-pothole"
              onPress={() => router.push("/(tabs)/inspect")}
              style={[styles.shortcutCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
              </View>
              <Text style={[styles.shortcutTitle, { color: colors.onSurfaceSecondary }]}>
                Scan Pothole
              </Text>
              <Text style={[styles.shortcutSub, { color: colors.muted }]}>AI Camera</Text>
            </Pressable>

            <Pressable
              testID="shortcut-view-tracker"
              onPress={() => router.push("/(tabs)/complaints")}
              style={[styles.shortcutCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="git-network-outline" size={20} color={colors.brandPrimary} />
              </View>
              <Text style={[styles.shortcutTitle, { color: colors.onSurfaceSecondary }]}>
                Track Status
              </Text>
              <Text style={[styles.shortcutSub, { color: colors.muted }]}>6 Stages</Text>
            </Pressable>

            <Pressable
              testID="shortcut-open-workspace"
              onPress={() => router.push("/(tabs)/workspace")}
              style={[styles.shortcutCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="briefcase-outline" size={20} color={colors.warning} />
              </View>
              <Text style={[styles.shortcutTitle, { color: colors.onSurfaceSecondary }]}>
                Workspace
              </Text>
              <Text style={[styles.shortcutSub, { color: colors.muted }]}>{role}</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Road Damage Feed */}
        <View style={styles.feedSection}>
          <View style={styles.feedHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.onSurfaceSecondary }]}>
              Recent Civic Reports
            </Text>
            <Pressable
              testID="view-all-complaints-btn"
              onPress={() => router.push("/(tabs)/complaints")}
              style={styles.seeAllBtn}
            >
              <Text style={[styles.seeAllText, { color: colors.brandPrimary }]}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} />
            </Pressable>
          </View>

          {complaintsLoading ? (
            <ActivityIndicator size="large" color={colors.brandPrimary} style={{ marginVertical: 20 }} />
          ) : recentComplaints.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={40} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.onSurfaceSecondary }]}>
                No Active Damage Reports
              </Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                All municipal road sectors are currently clear.
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {recentComplaints.map((item) => (
                <Pressable
                  key={item.id}
                  testID={`complaint-card-${item.id}`}
                  onPress={() => setSelectedComplaint(item)}
                  style={({ pressed }) => [
                    styles.complaintCard,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Image
                    source={{
                      uri:
                        item.image_url ||
                        (item.image_base64
                          ? item.image_base64.startsWith("data:")
                            ? item.image_base64
                            : `data:image/jpeg;base64,${item.image_base64}`
                          : "https://images.unsplash.com/photo-1709934730506-fba12664d4e4"),
                    }}
                    style={styles.cardImage}
                    contentFit="cover"
                  />

                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <SeverityBadge severity={item.severity} size="sm" />
                      <StatusBadge status={item.status} size="sm" />
                    </View>

                    <Text style={[styles.cardTitle, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                      {item.title}
                    </Text>

                    <View style={styles.cardLocationRow}>
                      <Ionicons name="location-outline" size={12} color={colors.muted} style={{ marginRight: 4 }} />
                      <Text style={[styles.cardLocationText, { color: colors.muted }]} numberOfLines={1}>
                        {item.location_name}
                      </Text>
                    </View>

                    <View style={styles.cardFooterRow}>
                      <Text style={[styles.cardAuthority, { color: colors.brandPrimary }]} numberOfLines={1}>
                        {item.assigned_authority_name || "Unassigned"}
                      </Text>
                      <Text style={[styles.cardTime, { color: colors.muted }]}>
                        {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Complaint Details Modal */}
      <ComplaintDetailsModal
        visible={!!selectedComplaint}
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
            await assignMutation.mutateAsync({
              id: selectedComplaint.id,
              authorityId,
              notes,
            });
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
  heroCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTextCol: {
    marginBottom: 16,
  },
  heroGreeting: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  heroSub: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  heroCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroCtaText: {
    fontSize: 14,
    fontWeight: "800",
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: "46%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  statIconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  shortcutsSection: {
    marginBottom: 20,
  },
  shortcutRow: {
    flexDirection: "row",
    gap: 10,
  },
  shortcutCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  shortcutSub: {
    fontSize: 10,
    marginTop: 2,
  },
  feedSection: {
    marginBottom: 16,
  },
  feedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    marginRight: 2,
  },
  cardList: {
    gap: 12,
  },
  complaintCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    height: 110,
  },
  cardImage: {
    width: 110,
    height: 110,
  },
  cardBody: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardLocationText: {
    fontSize: 11,
    flex: 1,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardAuthority: {
    fontSize: 10,
    fontWeight: "600",
    maxWidth: 140,
  },
  cardTime: {
    fontSize: 10,
  },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
