import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/src/theme";
import Ionicons from "@react-native-vector-icons/ionicons";

interface RepairModalProps {
  visible: boolean;
  complaintTitle: string;
  complaintId: string;
  onClose: () => void;
  onSubmit: (data: { notes: string; repairImageBase64?: string; repairImageUrl?: string }) => Promise<void>;
}

const SAMPLE_REPAIR_PHOTOS = [
  {
    name: "Asphalt Patch",
    url: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxhc3BoYWx0JTIwcm9hZCUyMHJlcGFpcnxlbnwwfHx8fDE3ODkwNTU1OTd8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    name: "Crack Sealant",
    url: "https://images.unsplash.com/photo-1635068741358-ab1b9813623f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
  },
];

export const RepairModal: React.FC<RepairModalProps> = ({
  visible,
  complaintTitle,
  complaintId,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const [notes, setNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_REPAIR_PHOTOS[0].url);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        if (result.assets[0].base64) {
          setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        } else {
          setSelectedImage(result.assets[0].uri);
        }
      }
    } catch (e) {
      console.warn("Picker error:", e);
    }
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        if (result.assets[0].base64) {
          setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        } else {
          setSelectedImage(result.assets[0].uri);
        }
      }
    } catch (e) {
      console.warn("Camera error:", e);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const isB64 = selectedImage?.startsWith("data:");
      await onSubmit({
        notes: notes || "Road surface restored and compacted. Hazard eliminated.",
        repairImageBase64: isB64 ? selectedImage : undefined,
        repairImageUrl: !isB64 ? selectedImage || undefined : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.onSurfaceSecondary }]}>
                Complete Repair & Upload Proof
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
                Ticket #{complaintId.slice(-5)?.toUpperCase() || complaintId}: {complaintTitle}
              </Text>
            </View>
            <Pressable testID="close-repair-modal-btn" onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Image Preview & Pickers */}
          <View style={styles.imageSection}>
            <Text style={[styles.sectionLabel, { color: colors.onSurfaceSecondary }]}>
              Proof-of-Fix Photo Evidence:
            </Text>
            {selectedImage ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} contentFit="cover" />
                <View style={styles.badgeVerified}>
                  <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.badgeVerifiedText}>PROOF ATTACHED</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.noImage, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
                <Ionicons name="camera-outline" size={36} color={colors.muted} />
                <Text style={[styles.noImageText, { color: colors.muted }]}>No repair photo selected</Text>
              </View>
            )}

            {/* Photo Action Buttons */}
            <View style={styles.photoActionsRow}>
              <Pressable
                testID="repair-camera-btn"
                onPress={handleCamera}
                style={[styles.actionBtn, { backgroundColor: colors.brandPrimary }]}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Take Photo</Text>
              </Pressable>

              <Pressable
                testID="repair-gallery-btn"
                onPress={handlePickImage}
                style={[styles.actionBtn, { backgroundColor: colors.brandSecondary }]}
              >
                <Ionicons name="images" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Gallery</Text>
              </Pressable>
            </View>

            {/* Quick Demo Presets */}
            <View style={styles.presetsRow}>
              <Text style={[styles.presetLabel, { color: colors.muted }]}>Demo Proof Samples:</Text>
              {SAMPLE_REPAIR_PHOTOS.map((p, i) => (
                <Pressable
                  key={i}
                  testID={`sample-repair-${i}`}
                  onPress={() => setSelectedImage(p.url)}
                  style={[
                    styles.presetChip,
                    { borderColor: selectedImage === p.url ? colors.success : colors.border },
                    selectedImage === p.url && { backgroundColor: "#DCFCE7" },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: selectedImage === p.url ? colors.success : colors.onSurfaceTertiary },
                    ]}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notes Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionLabel, { color: colors.onSurfaceSecondary }]}>
              Field Work Completion Notes:
            </Text>
            <TextInput
              testID="repair-notes-input"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Cleared debris, applied 50mm hot asphalt layer, compacted with hydraulic roller."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              style={[
                styles.textInput,
                { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderColor: colors.border },
              ]}
            />
          </View>

          {/* Submit Action */}
          <Pressable
            testID="submit-repair-resolution-btn"
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.success, opacity: isSubmitting || pressed ? 0.8 : 1 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Confirm & Mark Resolved</Text>
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
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: 280,
  },
  closeBtn: {
    padding: 4,
  },
  imageSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  previewWrap: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  badgeVerified: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeVerifiedText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  noImage: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    fontSize: 12,
    marginTop: 6,
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  presetsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  inputSection: {
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
