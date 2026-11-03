import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/theme";
import { UserRole } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";

export const DemoRoleBanner: React.FC = () => {
  const { user, role, logout, updateProfile, isLoading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const getRoleColor = (r: UserRole) => {
    switch (r) {
      case "USER":
        return colors.brandSecondary;
      case "AUTHORITY":
        return colors.warning;
      case "ADMIN":
        return colors.brandPrimary;
    }
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case "USER":
        return "Citizen Reporter";
      case "AUTHORITY":
        return "Authority Field Lead";
      case "ADMIN":
        return "City Admin Director";
    }
  };

  const handleLogout = async () => {
    setModalVisible(false);
    await logout();
    router.replace("/login");
  };

  const startEdit = () => {
    setEditName(user?.name || user?.full_name || "");
    setEditPhone(user?.phone || "");
    setSaveError(null);
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaveError(null);
    if (!editName.trim()) {
      setSaveError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(editName, editPhone);
      setEditing(false);
    } catch (e) {
      setSaveError((e as Error).message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setEditing(false);
    setSaveError(null);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.brand, borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        <View style={styles.brandIconWrap}>
          <Ionicons name="scan-circle" size={24} color="#FFFFFF" />
        </View>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.appName}>RoadLens</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) }]}>
              <Text testID="current-role-badge" style={styles.roleBadgeText}>
                {role}
              </Text>
            </View>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || user?.full_name || user?.email || "Guest"}
          </Text>
        </View>
      </View>

      <Pressable
        testID="profile-menu-btn"
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.profileBtn,
          { backgroundColor: colors.brandSecondary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="person-circle-outline" size={20} color="#FFFFFF" />
        )}
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.onSurfaceSecondary }]}>My Account</Text>
                <Text style={[styles.modalSub, { color: colors.muted }]}>
                  {editing ? "Update your contact details" : "Signed in session"}
                </Text>
              </View>
              <Pressable testID="close-profile-btn" onPress={closeModal} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <View style={[styles.profileCard, { borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: getRoleColor(role) }]}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileName, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                  {user?.name || user?.full_name || "User"}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.muted }]} numberOfLines={1}>
                  {user?.email}
                </Text>
                <View style={[styles.roleTag, { backgroundColor: getRoleColor(role) }]}>
                  <Text style={styles.roleTagText}>{getRoleLabel(role)}</Text>
                </View>
              </View>
            </View>

            {editing ? (
              <View testID="edit-profile-form">
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>Name</Text>
                <TextInput
                  testID="profile-name-input"
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.border }]}
                />
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>Phone</Text>
                <TextInput
                  testID="profile-phone-input"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="e.g. +1 (555) 123-4567"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.border }]}
                />
                {saveError && (
                  <Text testID="profile-save-error" style={[styles.saveError, { color: colors.error }]}>
                    {saveError}
                  </Text>
                )}
                <View style={styles.editActionRow}>
                  <Pressable
                    testID="cancel-edit-profile-btn"
                    onPress={() => setEditing(false)}
                    style={[styles.secondaryBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.onSurfaceSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    testID="save-profile-btn"
                    onPress={saveProfile}
                    disabled={saving}
                    style={[styles.saveBtn, { backgroundColor: colors.brandPrimary, opacity: saving ? 0.85 : 1 }]}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View style={[styles.detailRow, { borderColor: colors.border }]}>
                  <Ionicons name="call-outline" size={16} color={colors.muted} style={{ marginRight: 8 }} />
                  <Text testID="profile-phone-display" style={[styles.detailText, { color: colors.onSurfaceSecondary }]}>
                    {user?.phone ? user.phone : "No phone number added"}
                  </Text>
                </View>

                <Pressable
                  testID="edit-profile-btn"
                  onPress={startEdit}
                  style={[styles.editBtn, { backgroundColor: colors.brandPrimary }]}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </Pressable>

                <Pressable
                  testID="logout-btn"
                  onPress={handleLogout}
                  style={[styles.logoutBtn, { borderColor: colors.error }]}
                >
                  <Ionicons name="log-out-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
                  <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  brandIconWrap: {
    marginRight: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  userName: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
    maxWidth: 180,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 15,
    fontWeight: "800",
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  roleTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  roleTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "600",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 10,
  },
  editBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    marginBottom: 10,
  },
  saveError: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  editActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  saveBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
