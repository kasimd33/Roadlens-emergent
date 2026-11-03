import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";
import { StatusHistoryItem, ComplaintStatus } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";

interface StatusTimelineProps {
  currentStatus: ComplaintStatus;
  history: StatusHistoryItem[];
}

const STAGES: { key: ComplaintStatus; label: string; desc: string }[] = [
  { key: "SUBMITTED", label: "Submitted", desc: "Citizen filed report with AI damage scan" },
  { key: "ASSIGNED", label: "Assigned", desc: "Routed to municipal repair division" },
  { key: "ACKNOWLEDGED", label: "Acknowledged", desc: "Authority acknowledged dispatch order" },
  { key: "IN_PROGRESS", label: "In Progress", desc: "On-site field repairs underway" },
  { key: "RESOLVED", label: "Resolved", desc: "Repairs completed with proof evidence" },
  { key: "CLOSED", label: "Closed", desc: "Citizen / Admin verified and closed" },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus, history }) => {
  const { colors } = useTheme();

  const stageOrder = STAGES.map((s) => s.key);
  const currentIndex = stageOrder.indexOf(currentStatus);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoStr;
    }
  };

  return (
    <View testID="status-timeline-container" style={styles.container}>
      <Text style={[styles.headerTitle, { color: colors.onSurfaceSecondary }]}>
        Lifecycle Milestone Tracker
      </Text>

      <View style={styles.timelineList}>
        {STAGES.map((stage, idx) => {
          const isPassed = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          // Find matching history item
          const historyEntry = history.find((h) => h.status === stage.key);

          const circleBg = isPassed
            ? isCurrent
              ? colors.brandPrimary
              : colors.success
            : colors.surfaceTertiary;

          const circleBorder = isCurrent ? colors.brandSecondary : isPassed ? colors.success : colors.border;

          return (
            <View key={stage.key} style={styles.stepRow}>
              {/* Left Column: Indicator & Line */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.circle,
                    { backgroundColor: circleBg, borderColor: circleBorder },
                  ]}
                >
                  {isPassed ? (
                    <Ionicons
                      name={isCurrent ? "sync" : "checkmark"}
                      size={12}
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text style={[styles.stepNum, { color: colors.muted }]}>{idx + 1}</Text>
                  )}
                </View>
                {idx < STAGES.length - 1 && (
                  <View
                    style={[
                      styles.verticalLine,
                      { backgroundColor: idx < currentIndex ? colors.success : colors.border },
                    ]}
                  />
                )}
              </View>

              {/* Right Column: Stage Details */}
              <View style={styles.detailsCol}>
                <View style={styles.stageTitleRow}>
                  <Text
                    style={[
                      styles.stageLabel,
                      { color: isPassed ? colors.onSurfaceSecondary : colors.muted },
                      isCurrent && { color: colors.brandPrimary, fontWeight: "800" },
                    ]}
                  >
                    {stage.label}
                  </Text>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: colors.brandTertiary }]}>
                      <Text style={[styles.currentBadgeText, { color: colors.onBrandTertiary }]}>
                        CURRENT STAGE
                      </Text>
                    </View>
                  )}
                </View>

                {historyEntry ? (
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyNotes, { color: colors.onSurfaceTertiary }]}>
                      {historyEntry.notes || stage.desc}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.actorText, { color: colors.muted }]}>
                        By {historyEntry.changed_by_name} ({historyEntry.changed_by_role})
                      </Text>
                      <Text style={[styles.timeText, { color: colors.muted }]}>
                        • {formatDate(historyEntry.timestamp)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.pendingDesc, { color: colors.muted }]}>
                    {stage.desc}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
  },
  timelineList: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 52,
  },
  indicatorCol: {
    alignItems: "center",
    width: 24,
    marginRight: 12,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  stepNum: {
    fontSize: 10,
    fontWeight: "700",
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginTop: -2,
    marginBottom: -2,
  },
  detailsCol: {
    flex: 1,
    paddingBottom: 16,
  },
  stageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  historyInfo: {
    marginTop: 4,
  },
  historyNotes: {
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 2,
  },
  actorText: {
    fontSize: 11,
    fontWeight: "500",
  },
  timeText: {
    fontSize: 11,
    marginLeft: 4,
  },
  pendingDesc: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: "italic",
  },
});
