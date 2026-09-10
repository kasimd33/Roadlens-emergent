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
import { SeverityBadge } from "@/src/components/SeverityBadge";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ComplaintDetailsModal } from "@/src/components/ComplaintDetailsModal";
import { RepairModal } from "@/src/components/RepairModal";
import { AssignModal } from "@/src/components/AssignModal";
import { Complaint, Authority } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";

export default function WorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [activeRepairComplaint, setActiveRepairComplaint] = useState<Complaint | null>(null);
  const [activeAssignComplaint, setActiveAssignComplaint] = useState<Complaint | null>(null);

  // Queries
  const {
    data: allComplaints = [],
    isLoading: complaintsLoading,
    refetch: refetchComplaints,
  } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => api.getComplaints(),
  });

  const {
    data: authorities = [],
    isLoading: authLoading,
    refetch: refetchAuthorities,
  } = useQuery({
    queryKey: ["authorities"],
    queryFn: () => api.getAuthorities(),
  });

  const {
    data: stats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => api.getAdminStats(),
  });

  const {
    data: adminUsers = [],
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => api.getAdminUsers(),
    enabled: role === "ADMIN",
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
    await Promise.all([refetchComplaints(), refetchAuthorities(), refetchStats(), refetchUsers()]);
    setRefreshing(false);
  };

  // Role filtered complaints
  const assignedToAuthority = allComplaints.filter(
    (c: Complaint) =>
      c.assigned_authority_id === user?.authority_id ||
      c.assigned_authority_name?.includes("Downtown") ||
      c.status === "ASSIGNED" ||
      c.status === "ACKNOWLEDGED" ||
      c.status === "IN_PROGRESS"
  );

  const unassignedComplaints = allComplaints.filter(
    (c: Complaint) => !c.assigned_authority_id || c.status === "SUBMITTED"
  );

  const citizenMyReports = allComplaints.filter(
    (c: Complaint) => c.user_id === user?.id || c.user_name?.includes(user?.username || "")
  );

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
        {/* ==================================================================== */}
        {/* 1. AUTHORITY ROLE WORKSPACE VIEW */}
        {/* ==================================================================== */}
        {role === "AUTHORITY" && (
          <View style={styles.workspaceContainer}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.screenTitle, { color: colors.onSurfaceSecondary }]}>
                  Authority Field Workspace
                </Text>
                <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
                  {user?.authority_name || "Downtown Roads & Works Division"}
                </Text>
              </View>
              <View style={[styles.activeQueueBadge, { backgroundColor: colors.warning }]}>
                <Text style={styles.activeQueueText}>
                  {assignedToAuthority.length} Active Tickets
                </Text>
              </View>
            </View>

            {/* Authority Action Cards */}
            <Text style={[styles.sectionHeading, { color: colors.onSurfaceSecondary }]}>
              Assigned Field Work Orders
            </Text>

            {assignedToAuthority.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="checkmark-done-circle" size={44} color={colors.success} />
                <Text style={[styles.emptyTitle, { color: colors.onSurfaceSecondary }]}>
                  All Work Orders Cleared!
                </Text>
                <Text style={[styles.emptySub, { color: colors.muted }]}>
                  No pending road maintenance dispatched to your unit.
                </Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {assignedToAuthority.map((c: Complaint) => (
                  <View
                    key={c.id}
                    testID={`authority-ticket-card-${c.id}`}
                    style={[styles.authorityCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                  >
                    <View style={styles.authCardTop}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={styles.badgesRow}>
                          <SeverityBadge severity={c.severity} size="sm" />
                          <StatusBadge status={c.status} size="sm" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                          {c.title}
                        </Text>
                        <Text style={[styles.locationText, { color: colors.muted }]} numberOfLines={1}>
                          {c.location_name}
                        </Text>
                      </View>
                      <Image
                        source={{
                          uri:
                            c.image_url ||
                            (c.image_base64 ? c.image_base64 : "https://images.unsplash.com/photo-1709934730506-fba12664d4e4"),
                        }}
                        style={styles.thumbImage}
                        contentFit="cover"
                      />
                    </View>

                    {/* Authority Action Pipeline Buttons */}
                    <View style={styles.pipelineActionsRow}>
                      {c.status === "ASSIGNED" && (
                        <Pressable
                          testID={`ack-btn-${c.id}`}
                          onPress={() =>
                            updateStatusMutation.mutate({
                              id: c.id,
                              status: "ACKNOWLEDGED",
                              notes: "Field lead acknowledged ticket and scheduled dispatch.",
                            })
                          }
                          style={[styles.pipelineBtn, { backgroundColor: colors.warning }]}
                        >
                          <Ionicons name="hand-left" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.pipelineBtnText}>Acknowledge</Text>
                        </Pressable>
                      )}

                      {(c.status === "ACKNOWLEDGED" || c.status === "ASSIGNED") && (
                        <Pressable
                          testID={`start-work-btn-${c.id}`}
                          onPress={() =>
                            updateStatusMutation.mutate({
                              id: c.id,
                              status: "IN_PROGRESS",
                              notes: "Maintenance crew arrived with equipment.",
                            })
                          }
                          style={[styles.pipelineBtn, { backgroundColor: colors.brandPrimary }]}
                        >
                          <Ionicons name="construct" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.pipelineBtnText}>Start Work</Text>
                        </Pressable>
                      )}

                      {c.status === "IN_PROGRESS" && (
                        <Pressable
                          testID={`resolve-btn-${c.id}`}
                          onPress={() => setActiveRepairComplaint(c)}
                          style={[styles.pipelineBtn, { backgroundColor: colors.success }]}
                        >
                          <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.pipelineBtnText}>Upload Proof & Resolve</Text>
                        </Pressable>
                      )}

                      <Pressable
                        testID={`details-btn-${c.id}`}
                        onPress={() => setSelectedComplaint(c)}
                        style={[styles.pipelineBtnOutline, { borderColor: colors.border }]}
                      >
                        <Text style={[styles.pipelineBtnOutlineText, { color: colors.onSurfaceSecondary }]}>
                          Full Details
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ==================================================================== */}
        {/* 2. ADMIN ROLE GOVERNANCE VIEW */}
        {/* ==================================================================== */}
        {role === "ADMIN" && (
          <View style={styles.workspaceContainer}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.screenTitle, { color: colors.onSurfaceSecondary }]}>
                  City Governance Dashboard
                </Text>
                <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
                  Municipal Overview & Authority Dispatching
                </Text>
              </View>
            </View>

            {/* Unassigned Dispatch Queue */}
            <View style={styles.adminSection}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionHeading, { color: colors.onSurfaceSecondary }]}>
                  Unassigned / Pending Dispatch ({unassignedComplaints.length})
                </Text>
              </View>

              {unassignedComplaints.length === 0 ? (
                <View style={[styles.emptySmallCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    All current complaints are assigned to municipal authorities.
                  </Text>
                </View>
              ) : (
                <View style={styles.cardList}>
                  {unassignedComplaints.map((c: Complaint) => (
                    <View
                      key={c.id}
                      testID={`unassigned-card-${c.id}`}
                      style={[styles.adminTicketCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgesRow}>
                          <SeverityBadge severity={c.severity} size="sm" />
                          <StatusBadge status={c.status} size="sm" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                          {c.title}
                        </Text>
                        <Text style={[styles.locationText, { color: colors.muted }]} numberOfLines={1}>
                          {c.location_name}
                        </Text>
                      </View>

                      <Pressable
                        testID={`admin-dispatch-btn-${c.id}`}
                        onPress={() => setActiveAssignComplaint(c)}
                        style={[styles.dispatchBtn, { backgroundColor: colors.brandPrimary }]}
                      >
                        <Ionicons name="git-branch" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.dispatchBtnText}>Assign</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Demo Authorities Directory */}
            <View style={styles.adminSection}>
              <Text style={[styles.sectionHeading, { color: colors.onSurfaceSecondary }]}>
                Municipal Authority Divisions ({authorities.length})
              </Text>

              <View style={styles.authoritiesGrid}>
                {authorities.map((auth: Authority) => (
                  <View
                    key={auth.id}
                    testID={`authority-dir-card-${auth.code.toLowerCase()}`}
                    style={[styles.authorityDirCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                  >
                    <View style={styles.dirCardHeader}>
                      <Ionicons name="business" size={18} color={colors.brandPrimary} />
                      <Text style={[styles.dirCode, { color: colors.brandPrimary }]}>{auth.code}</Text>
                    </View>
                    <Text style={[styles.dirName, { color: colors.onSurfaceSecondary }]}>{auth.name}</Text>
                    <Text style={[styles.dirZone, { color: colors.muted }]}>Zone: {auth.zone}</Text>
                    <Text style={[styles.dirCoverage, { color: colors.muted }]}>Area: {auth.coverage_area}</Text>
                    <View style={styles.dirStatsRow}>
                      <Text style={[styles.dirStat, { color: colors.warning }]}>
                        Active: {auth.active_complaints_count || 0}
                      </Text>
                      <Text style={[styles.dirStat, { color: colors.success }]}>
                        Resolved: {auth.resolved_count || 0}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Registered Users & Roles Table */}
            <View style={styles.adminSection}>
              <Text style={[styles.sectionHeading, { color: colors.onSurfaceSecondary }]}>
                Registered User Directory ({adminUsers.length})
              </Text>

              <View style={[styles.usersCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                {adminUsers.map((u: any, idx: number) => (
                  <View
                    key={u.id || idx}
                    testID={`user-row-${u.username}`}
                    style={[
                      styles.userRow,
                      idx < adminUsers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.userAvatarCircle}>
                      <Ionicons name="person" size={14} color={colors.brandPrimary} />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text style={[styles.userRowName, { color: colors.onSurfaceSecondary }]}>
                        {u.full_name || u.username}
                      </Text>
                      <Text style={[styles.userRowEmail, { color: colors.muted }]}>{u.username}</Text>
                    </View>
                    <View style={[styles.rolePill, { backgroundColor: colors.brandTertiary }]}>
                      <Text style={[styles.rolePillText, { color: colors.onBrandTertiary }]}>{u.role}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* 3. CITIZEN USER ROLE VIEW */}
        {/* ==================================================================== */}
        {role === "USER" && (
          <View style={styles.workspaceContainer}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.screenTitle, { color: colors.onSurfaceSecondary }]}>
                  Citizen Dashboard & Reports
                </Text>
                <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
                  Track issues you have reported across the city
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionHeading, { color: colors.onSurfaceSecondary }]}>
              My Reported Road Damage ({citizenMyReports.length})
            </Text>

            {citizenMyReports.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="camera-outline" size={44} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.onSurfaceSecondary }]}>
                  No Reports Filed Yet
                </Text>
                <Text style={[styles.emptySub, { color: colors.muted }]}>
                  Use the Inspect tab to scan road damage and submit civic tickets.
                </Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {citizenMyReports.map((c: Complaint) => (
                  <Pressable
                    key={c.id}
                    testID={`citizen-my-report-${c.id}`}
                    onPress={() => setSelectedComplaint(c)}
                    style={[styles.complaintCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                  >
                    <Image
                      source={{
                        uri:
                          c.image_url ||
                          (c.image_base64 ? c.image_base64 : "https://images.unsplash.com/photo-1709934730506-fba12664d4e4"),
                      }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                    <View style={styles.cardContent}>
                      <View style={styles.badgesRow}>
                        <SeverityBadge severity={c.severity} size="sm" />
                        <StatusBadge status={c.status} size="sm" />
                      </View>
                      <Text style={[styles.cardTitle, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                        {c.title}
                      </Text>
                      <Text style={[styles.locationText, { color: colors.muted }]} numberOfLines={1}>
                        {c.location_name}
                      </Text>
                      <Text style={[styles.dateText, { color: colors.brandPrimary }]}>
                        Assigned: {c.assigned_authority_name || "Awaiting Dispatch"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
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

      {/* Authority Quick Repair Modal */}
      {activeRepairComplaint && (
        <RepairModal
          visible={!!activeRepairComplaint}
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

      {/* Admin Quick Assign Modal */}
      {activeAssignComplaint && (
        <AssignModal
          visible={!!activeAssignComplaint}
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
  workspaceContainer: {
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  activeQueueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeQueueText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardList: {
    gap: 12,
  },
  authorityCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  authCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  locationText: {
    fontSize: 11,
    marginTop: 2,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  pipelineActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  pipelineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 6,
  },
  pipelineBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  pipelineBtnOutline: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: "center",
  },
  pipelineBtnOutlineText: {
    fontSize: 12,
    fontWeight: "600",
  },
  adminSection: {
    gap: 10,
  },
  adminTicketCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  dispatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  dispatchBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  authoritiesGrid: {
    gap: 10,
  },
  authorityDirCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  dirCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  dirCode: {
    fontSize: 11,
    fontWeight: "800",
  },
  dirName: {
    fontSize: 14,
    fontWeight: "700",
  },
  dirZone: {
    fontSize: 11,
    marginTop: 2,
  },
  dirCoverage: {
    fontSize: 10,
  },
  dirStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  dirStat: {
    fontSize: 11,
    fontWeight: "700",
  },
  usersCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  userAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  userRowName: {
    fontSize: 13,
    fontWeight: "700",
  },
  userRowEmail: {
    fontSize: 11,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: "800",
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
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySmallCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
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
