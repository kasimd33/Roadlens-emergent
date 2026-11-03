import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Modal, ScrollView } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api } from "@/src/api/client";
import { useTheme } from "@/src/theme";
import { Authority } from "@/src/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  authorities: Authority[];
}

export const CreateAuthorityUserModal: React.FC<Props> = ({ visible, onClose, authorities }) => {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authorityId, setAuthorityId] = useState<string>(authorities[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.createAuthorityUser({ email, password, name, authority_id: authorityId }),
    onSuccess: (u: any) => {
      setSuccess(`Authority account created for ${u.email}`);
      setName("");
      setEmail("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (e: any) => setError(e?.message || "Could not create authority account."),
  });

  const handleSubmit = () => {
    setError(null);
    setSuccess(null);
    if (!name.trim()) return setError("Enter the engineer's name.");
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!authorityId) return setError("Select a department.");
    mutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.onSurface }]}>Create Authority Account</Text>
            <Pressable testID="close-create-authority-btn" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={[styles.sub, { color: colors.muted }]}>
            Authority logins can only be created here by an Admin. They cannot self-register.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Engineer Name</Text>
            <TextInput
              testID="authority-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Jordan Blake"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.onSurface, borderColor: colors.border }]}
            />

            <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Login Email</Text>
            <TextInput
              testID="authority-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="engineer@roadlens.gov"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.onSurface, borderColor: colors.border }]}
            />

            <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Temporary Password</Text>
            <TextInput
              testID="authority-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.onSurface, borderColor: colors.border }]}
            />

            <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Assign to Department</Text>
            {authorities.map((a) => {
              const selected = authorityId === a.id;
              return (
                <Pressable
                  key={a.id}
                  testID={`authority-dept-${a.id}`}
                  onPress={() => setAuthorityId(a.id)}
                  style={[
                    styles.deptRow,
                    { borderColor: selected ? colors.brandPrimary : colors.border, backgroundColor: selected ? colors.brandTertiary : colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={selected ? colors.brandPrimary : colors.muted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.deptName, { color: colors.onSurfaceSecondary }]}>{a.name}</Text>
                </Pressable>
              );
            })}

            {error && <Text testID="create-authority-error" style={[styles.msg, { color: colors.error }]}>{error}</Text>}
            {success && <Text testID="create-authority-success" style={[styles.msg, { color: colors.success }]}>{success}</Text>}
          </ScrollView>

          <Pressable
            testID="submit-create-authority-btn"
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.brandPrimary, opacity: mutation.isPending || pressed ? 0.85 : 1 }]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Create Authority Login</Text>
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
  deptRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 8 },
  deptName: { fontSize: 13, fontWeight: "700", flex: 1 },
  msg: { fontSize: 12, fontWeight: "600", marginTop: 12 },
  submitBtn: { height: 50, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 16 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
