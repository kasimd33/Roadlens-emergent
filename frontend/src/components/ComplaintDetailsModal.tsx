import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { Complaint, Authority } from "@/src/types";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { BoundingBoxView } from "./BoundingBoxView";
import { StatusTimeline } from "./StatusTimeline";
import { RepairModal } from "./RepairModal";
import { AssignModal } from "./AssignModal";
import Ionicons from "@react-native-vector-icons/ionicons";

interface ComplaintDetailsModalProps {
  visible: boolean;
  complaint: Complaint | null;
  authorities: Authority[];
  onClose: () => void;
  onStatusUpdate: (
    status: string,
    notes?: string,
    repairBase64?: string,
    repairUrl?: string
  ) => Promise<void>;
  onAssign: (authorityId: string, notes: string) => Promise<void>;
}

export const ComplaintDetailsModal: React.FC<ComplaintDetailsModalProps> = ({
  visible,
  complaint,
  authorities,
  onClose,
  onStatusUpdate,
  onAssign,
}) => {
  const { colors } = useTheme();
  const { role } = useAuth();
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isActing, setIsActing] = useState(false);

  if (!complaint) return null;

  const handleAction = async (status: string, notes?: string) => {
    setIsActing(true);
    try {
      await onStatusUpdate(status, notes);
    } finally {
      setIsActing(false);
    }
  };

  const handleRepairSubmit = async (data: {
    notes: string;
    repairImageBase64?: string;
    repairImageUrl?: string;
  }) => {
    await onStatusUpdate("RESOLVED", data.notes, data.repairImageBase64, data.repairImageUrl);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Sticky Header */}
        <View style={[styles.header, { backgroundColor: colors.brand }]}>
          <Pressable
            testID="close-complaint-details-btn"
            onPress={onClose}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              #{complaint.id.slice(-5).toUpperCase()}: {complaint.title}
            </Text>
            <Text style={styles.headerSub}>RoadLens Civic Complaint</Text>
          </View>
          <StatusBadge status={complaint.status} size="sm" />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* AI Inspection Image with Bounding Box */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.onSurfaceSecondary }]}>
              AI Visual Damage Scan
            </Text>
            <BoundingBoxView
              imageUrl={complaint.image_url}
              imageBase64={complaint.image_base64}
              boundingBox={complaint.bounding_box}
              damageType={complaint.damage_type}
              confidence={complaint.confidence}
              severity={complaint.severity}
              height={220}
            />
          </View>

          {/* Quick Metrics Bar */}
          <View style={[styles.metricsCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Severity</Text>
              <SeverityBadge severity={complaint.severity} size="sm" />
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Confidence</Text>
              <Text style={[styles.metricValue, { color: colors.onSurfaceSecondary }]}>
                {complaint.confidence ? `${Math.round(complaint.confidence)}%` : "AI Verified"}
              </Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Damage Type</Text>
              <Text style={[styles.metricValue, { color: colors.brandPrimary }]}>
                {complaint.damage_type}
              </Text>
            </View>
          </View>

          {/* Location & Authority Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color={colors.error} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.onSurfaceSecondary }]}>
                  {complaint.location_name}
                </Text>
                {complaint.landmark ? (
                  <Text style={[styles.infoSubtitle, { color: colors.muted }]}>
                    Landmark: {complaint.landmark}
                  </Text>
                ) : null}
                <Text style={[styles.geoCoords, { color: colors.muted }]}>
                  GPS: {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                </Text>
              </View>
            </View>

            <View style={[styles.dividerHorizontal, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Ionicons name="business" size={18} color={colors.brandPrimary} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.onSurfaceSecondary }]}>
                  {complaint.assigned_authority_name || "UNASSIGNED (Pending Dispatch)"}
                </Text>
                <Text style={[styles.infoSubtitle, { color: colors.muted }]}>
                  {complaint.assigned_authority_name ? "Assigned Municipal Unit" : "Awaiting Admin Routing"}
                </Text>
              </View>
              {role === "ADMIN" && (
                <Pressable
                  testID="admin-reassign-btn"
                  onPress={() => setShowAssignModal(true)}
                  style={[styles.smallBtn, { backgroundColor: colors.brandTertiary }]}
                >
                  <Text style={[styles.smallBtnText, { color: colors.onBrandTertiary }]}>
                    {complaint.assigned_authority_id ? "Reassign" : "Assign"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Description */}
          {complaint.description ? (
            <View style={[styles.descCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.descLabel, { color: colors.muted }]}>Citizen Report Notes:</Text>
              <Text style={[styles.descText, { color: colors.onSurfaceSecondary }]}>
                {complaint.description}
              </Text>
            </View>
          ) : null}

          {/* Repair Proof Evidence if RESOLVED or CLOSED */}
          {complaint.repair_evidence ? (
            <View style={[styles.proofCard, { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }]}>
              <View style={styles.proofHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.proofTitle}>Repair Verified & Evidence Attached</Text>
              </View>
              {complaint.repair_evidence.image_url || complaint.repair_evidence.image_base64 ? (
                <Image
                  source={{
                    uri:
                      complaint.repair_evidence.image_base64 ||
                      complaint.repair_evidence.image_url ||
                      "",
                  }}
                  style={styles.proofImage}
                  contentFit="cover"
                />
              ) : null}
              <Text style={styles.proofNotes}>
                {complaint.repair_evidence.notes || "Repairs completed on site by municipal crew."}
              </Text>
              <Text style={styles.proofMeta}>
                Resolved by {complaint.repair_evidence.resolved_by_name || "Field Unit"} on{" "}
                {complaint.repair_evidence.resolved_at
                  ? new Date(complaint.repair_evidence.resolved_at).toLocaleDateString()
                  : "recently"}
              </Text>
            </View>
          ) : null}

          {/* Status History & Milestone Timeline */}
          <StatusTimeline
            currentStatus={complaint.status}
            history={complaint.status_history || []}
          />

          {/* Action Buttons based on Role & Current Status */}
          <View style={styles.actionsSection}>
            <Text style={[styles.actionSectionTitle, { color: colors.onSurfaceSecondary }]}>
              Role Actions ({role})
            </Text>

            {/* Authority Actions */}
            {role === "AUTHORITY" && (
              <View style={styles.roleActionsContainer}>
                {complaint.status === "ASSIGNED" && (
                  <Pressable
                    testID="authority-acknowledge-btn"
                    onPress={() => handleAction("ACKNOWLEDGED", "Authority crew acknowledged work order.")}
                    disabled={isActing}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.warning }]}
                  >
                    {isActing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="hand-left" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.primaryActionBtnText}>Acknowledge Work Order</Text>
                      </>
                    )}
                  </Pressable>
                )}

                {(complaint.status === "ACKNOWLEDGED" || complaint.status === "ASSIGNED") && (
                  <Pressable
                    testID="authority-start-work-btn"
                    onPress={() => handleAction("IN_PROGRESS", "Field repair unit arrived on site.")}
                    disabled={isActing}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.brandPrimary }]}
                  >
                    {isActing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="construct" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.primaryActionBtnText}>Start On-Site Work (In Progress)</Text>
                      </>
                    )}
                  </Pressable>
                )}

                {complaint.status === "IN_PROGRESS" && (
                  <Pressable
                    testID="authority-upload-repair-btn"
                    onPress={() => setShowRepairModal(true)}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.success }]}
                  >
                    <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionBtnText}>Upload Repair Proof & Resolve</Text>
                  </Pressable>
                )}

                {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (
                  <View style={[styles.resolvedNotice, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={{ color: "#15803D", fontWeight: "700", textAlign: "center" }}>
                      Work is complete for this ticket.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Citizen Actions */}
            {role === "USER" && (
              <View style={styles.roleActionsContainer}>
                {complaint.status === "RESOLVED" && (
                  <Pressable
                    testID="citizen-close-complaint-btn"
                    onPress={() => handleAction("CLOSED", "Citizen confirmed satisfactory road repair.")}
                    disabled={isActing}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.brandPrimary }]}
                  >
                    {isActing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.primaryActionBtnText}>Confirm Repair & Close Complaint</Text>
                      </>
                    )}
                  </Pressable>
                )}

                {complaint.status !== "RESOLVED" && complaint.status !== "CLOSED" && (
                  <View style={[styles.statusNotice, { backgroundColor: colors.surfaceTertiary }]}>
                    <Ionicons name="hourglass-outline" size={18} color={colors.brandPrimary} style={{ marginRight: 8 }} />
                    <Text style={[styles.statusNoticeText, { color: colors.onSurfaceTertiary }]}>
                      Municipal team is actively processing your ticket (#{complaint.id.slice(-5).toUpperCase()}).
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Admin Actions */}
            {role === "ADMIN" && (
              <View style={styles.adminActionsRow}>
                <Pressable
                  testID="admin-assign-drawer-btn"
                  onPress={() => setShowAssignModal(true)}
                  style={[styles.adminBtn, { backgroundColor: colors.brandPrimary }]}
                >
                  <Ionicons name="git-branch" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.adminBtnText}>Assign Authority</Text>
                </Pressable>

                {complaint.status !== "CLOSED" && (
                  <Pressable
                    testID="admin-close-complaint-btn"
                    onPress={() => handleAction("CLOSED", "Administrative closure following municipal review.")}
                    disabled={isActing}
                    style={[styles.adminBtn, { backgroundColor: colors.surfaceInverse }]}
                  >
                    <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.adminBtnText}>Close Ticket</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Repair Modal */}
        <RepairModal
          visible={showRepairModal}
          complaintId={complaint.id}
          complaintTitle={complaint.title}
          onClose={() => setShowRepairModal(false)}
          onSubmit={handleRepairSubmit}
        />

        {/* Assign Modal */}
        <AssignModal
          visible={showAssignModal}
          complaintId={complaint.id}
          complaintTitle={complaint.title}
          authorities={authorities}
          currentAssignedId={complaint.assigned_authority_id}
          onClose={() => setShowAssignModal(false)}
          onAssign={onAssign}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  headerSub: {
    color: "#93C5FD",
    fontSize: 11,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  metricsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  dividerVertical: {
    width: 1,
    height: 30,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  geoCoords: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: "monospace",
  },
  dividerHorizontal: {
    height: 1,
    marginVertical: 10,
  },
  smallBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  descCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
  },
  proofCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  proofHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  proofTitle: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "700",
  },
  proofImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
  },
  proofNotes: {
    color: "#166534",
    fontSize: 12,
    lineHeight: 16,
  },
  proofMeta: {
    color: "#15803D",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "500",
  },
  actionsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  roleActionsContainer: {
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  resolvedNotice: {
    padding: 12,
    borderRadius: 8,
  },
  statusNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  statusNoticeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  adminActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  adminBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  adminBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
