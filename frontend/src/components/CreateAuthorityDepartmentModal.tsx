import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Modal, ScrollView } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api } from "@/src/api/client";
import { useTheme } from "@/src/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CreateAuthorityDepartmentModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [coverage, setCoverage] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setZone("");
    setCoverage("");
    setPhone("");
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      api.createAuthority({
        name,
        zone,
        coverage_area: coverage || undefined,
        contact_phone: phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authorities"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      reset();
      onClose();
    },
    onError: (e: any) => setError(e?.message || "Could not create department."),
  });

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) return setError("Enter the department name.");
    if (!zone.trim()) return setError("Enter the coverage zone.");
    mutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.onSurface }]}>New Authority Department</Text>
            <Pressable testID="close-create-dept-btn" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={[styles.sub, { color: colors.muted }]}>
            Create a municipal division that complaints in this zone will be auto-assigned to.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Department Name</Text>
            <TextInput
              testID="dept-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Eastside Roads & Works Division"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.onSurface, borderColor: colors.border }]}
            />

            <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Coverage Zone</Text>
            <TextInput
              testID="dept-zone-input"
              value={zone}
              onChangeText={setZone}
              placeholder="e.g. East District & Riverside"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.onSurface, borderColor: colors.border }]}
            />

            <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Coverage Area (optional)</Text>
            <TextInput
              testID="dept-coverage-input"
              value={coverage}
              onChangeText={setCoverage}
              placeholder="e.g. East Ave, River Rd, 20th - 40th St"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.onSurface, borderColor: colors.border }]}
            />

            <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Contact Phone (optional)</Text>
            <TextInput
              testID="dept-phone-input"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.onSurface, borderColor: colors.border }]}
            />

            {error && <Text testID="create-dept-error" style={[styles.msg, { color: colors.error }]}>{error}</Text>}
          </ScrollView>

          <Pressable
            testID="submit-create-dept-btn"
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.brandPrimary, opacity: mutation.isPending || pressed ? 0.85 : 1 }]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Create Department</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "88%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "900" },
  sub: { fontSize: 12, marginTop: 4, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "800", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 48, fontSize: 14 },
  msg: { fontSize: 12, fontWeight: "600", marginTop: 12 },
  submitBtn: { height: 50, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 16 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
