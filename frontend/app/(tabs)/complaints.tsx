import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
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
import { Complaint } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";

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

export default function ComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Queries
  const {
    data: complaints = [],
    isLoading,
    refetch,
  } = useQuery({
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
    await refetch();
    setRefreshing(false);
  };

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
          <Text style={[styles.screenTitle, { color: colors.onSurfaceSecondary }]}>
            Civic Complaint Tracker
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
            Real-time municipal lifecycle: SUBMITTED → CLOSED
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 8 }} />
          <TextInput
            testID="complaint-search-input"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by street, damage type, or keyword..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.onSurface }]}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* P0 Category Filter Chip Row (Single Horizontal Scroller) */}
        <View style={styles.chipRowWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRowContent}
          >
            {STATUS_FILTERS.map((s) => {
              const isSelected = statusFilter === s;
              return (
                <Pressable
                  key={s}
                  testID={`filter-status-${s.toLowerCase()}`}
                  onPress={() => setStatusFilter(s)}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? colors.brandPrimary : colors.border,
                      backgroundColor: isSelected ? colors.brandPrimary : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? "#FFFFFF" : colors.onSurfaceSecondary },
                    ]}
                  >
                    {s === "ALL" ? "All Statuses" : s.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Severity Filter Row */}
        <View style={styles.chipRowWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRowContent}
          >
            {SEVERITY_FILTERS.map((sev) => {
              const isSelected = severityFilter === sev;
              return (
                <Pressable
                  key={sev}
                  testID={`filter-severity-${sev.toLowerCase()}`}
                  onPress={() => setSeverityFilter(sev)}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? colors.brandSecondary : colors.border,
                      backgroundColor: isSelected ? colors.brandTertiary : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? colors.onBrandTertiary : colors.onSurfaceSecondary },
                    ]}
                  >
                    {sev === "ALL" ? "All Severities" : `${sev} Severity`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Complaints List Feed */}
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.brandPrimary} style={{ marginVertical: 32 }} />
        ) : complaints.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={44} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.onSurfaceSecondary }]}>
              No Complaints Match Filters
            </Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              Try selecting a different status filter or clearing your search query.
            </Text>
          </View>
        ) : (
          <View style={styles.complaintList}>
            {complaints.map((item: Complaint) => (
              <Pressable
                key={item.id}
                testID={`complaints-item-${item.id}`}
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

                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <SeverityBadge severity={item.severity} size="sm" />
                    <StatusBadge status={item.status} size="sm" />
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                    {item.title}
                  </Text>

                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={12} color={colors.muted} style={{ marginRight: 4 }} />
                    <Text style={[styles.locationText, { color: colors.muted }]} numberOfLines={1}>
                      {item.location_name}
                    </Text>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <View style={styles.authBadge}>
                      <Ionicons name="business-outline" size={12} color={colors.brandPrimary} style={{ marginRight: 4 }} />
                      <Text style={[styles.authText, { color: colors.brandPrimary }]} numberOfLines={1}>
                        {item.assigned_authority_name || "Unassigned"}
                      </Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.muted }]}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
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
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  chipRowWrapper: {
    height: 48,
    marginBottom: 8,
  },
  chipRowContent: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  chip: {
    height: 36,
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  complaintList: {
    gap: 12,
    marginTop: 8,
  },
  complaintCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    height: 114,
  },
  cardImage: {
    width: 114,
    height: 114,
  },
  cardContent: {
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
    fontWeight: "800",
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authBadge: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 160,
  },
  authText: {
    fontSize: 10,
    fontWeight: "700",
  },
  dateText: {
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
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
