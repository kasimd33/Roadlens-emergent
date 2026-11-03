import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useTheme } from "@/src/theme";
import { Authority } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";

interface AssignModalProps {
  visible: boolean;
  complaintId: string;
  complaintTitle: string;
  authorities: Authority[];
  currentAssignedId?: string | null;
  onClose: () => void;
  onAssign: (authorityId: string, notes: string) => Promise<void>;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  visible,
  complaintId,
  complaintTitle,
  authorities,
  currentAssignedId,
  onClose,
  onAssign,
}) => {
  const { colors } = useTheme();
  const [selectedAuthId, setSelectedAuthId] = useState<string>(
    currentAssignedId || (authorities[0]?.id ?? "")
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssign = async () => {
    if (!selectedAuthId) return;
    setIsSubmitting(true);
    try {
      await onAssign(selectedAuthId, notes);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.onSurfaceSecondary }]}>
                Dispatch & Assign Authority
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
                Ticket #{complaintId.slice(-5)?.toUpperCase() || complaintId}: {complaintTitle}
              </Text>
            </View>
            <Pressable testID="close-assign-modal-btn" onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.onSurfaceSecondary }]}>
            Select Municipal Division / Department:
          </Text>

          <View style={styles.list}>
            {authorities.map((auth) => {
              const isSelected = selectedAuthId === auth.id;
              return (
                <Pressable
                  key={auth.id}
                  testID={`select-authority-${auth.code.toLowerCase()}`}
                  onPress={() => setSelectedAuthId(auth.id)}
                  style={[
                    styles.authCard,
                    { borderColor: isSelected ? colors.brandPrimary : colors.border },
                    isSelected && { backgroundColor: colors.surfaceTertiary },
                  ]}
                >
                  <View style={[styles.radio, { borderColor: isSelected ? colors.brandPrimary : colors.border }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.brandPrimary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.authName, { color: colors.onSurfaceSecondary }]}>
                      {auth.name}
                    </Text>
                    <Text style={[styles.authZone, { color: colors.brandPrimary }]}>
                      Zone: {auth.zone}
                    </Text>
                    <Text style={[styles.authCoverage, { color: colors.muted }]}>
                      Coverage: {auth.coverage_area}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.onSurfaceSecondary, marginTop: 12 }]}>
            Dispatch Instructions (Optional):
          </Text>
          <TextInput
            testID="dispatch-notes-input"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Priority dispatch due to peak hour traffic congestion."
            placeholderTextColor={colors.muted}
            style={[
              styles.textInput,
              { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderColor: colors.border },
            ]}
          />

          <Pressable
            testID="confirm-dispatch-btn"
            onPress={handleAssign}
            disabled={isSubmitting || !selectedAuthId}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.brandPrimary, opacity: isSubmitting || pressed ? 0.8 : 1 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Dispatch to Authority</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  list: {
    gap: 8,
  },
  authCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  authName: {
    fontSize: 13,
    fontWeight: "700",
  },
  authZone: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  authCoverage: {
    fontSize: 10,
    marginTop: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    marginBottom: 16,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
