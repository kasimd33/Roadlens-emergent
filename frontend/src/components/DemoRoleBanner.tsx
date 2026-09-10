import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/theme";
import { UserRole } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";

export const DemoRoleBanner: React.FC = () => {
  const { user, role, demoLogin, logout, isLoading } = useAuth();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const getRoleTitle = (r: UserRole) => {
    switch (r) {
      case "USER":
        return "Citizen Reporter";
      case "AUTHORITY":
        return "Authority Field Lead";
      case "ADMIN":
        return "City Admin Director";
    }
  };

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

  const handleRoleSwitch = async (targetRole: UserRole) => {
    setModalVisible(false);
    await demoLogin(targetRole);
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
            {user?.full_name || user?.username || "Guest Citizen"}
          </Text>
        </View>
      </View>

      <Pressable
        testID="open-role-switcher-btn"
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.switchBtn,
          { backgroundColor: colors.brandSecondary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.switchBtnText}>Switch Role</Text>
          </>
        )}
      </Pressable>

      {/* Role Switcher Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.onSurfaceSecondary }]}>
                  Demo Role Switcher
                </Text>
                <Text style={[styles.modalSub, { color: colors.muted }]}>
                  Instantly simulate and test all 3 civic workflows
                </Text>
              </View>
              <Pressable
                testID="close-role-switcher-btn"
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            {/* Role Options */}
            <Pressable
              testID="switch-to-citizen-btn"
              onPress={() => handleRoleSwitch("USER")}
              style={[
                styles.roleOptionCard,
                { borderColor: role === "USER" ? colors.brandPrimary : colors.border },
                role === "USER" && { backgroundColor: colors.surfaceTertiary },
              ]}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="person" size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.roleCardTitleRow}>
                  <Text style={[styles.roleName, { color: colors.onSurfaceSecondary }]}>
                    Citizen (USER)
                  </Text>
                  {role === "USER" && <Text style={styles.activeTag}>ACTIVE</Text>}
                </View>
                <Text style={[styles.roleDesc, { color: colors.muted }]}>
                  Scan road damage, get AI bounding box, submit reports, track status.
                </Text>
              </View>
            </Pressable>

            <Pressable
              testID="switch-to-authority-btn"
              onPress={() => handleRoleSwitch("AUTHORITY")}
              style={[
                styles.roleOptionCard,
                { borderColor: role === "AUTHORITY" ? colors.warning : colors.border },
                role === "AUTHORITY" && { backgroundColor: colors.surfaceTertiary },
              ]}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="construct" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.roleCardTitleRow}>
                  <Text style={[styles.roleName, { color: colors.onSurfaceSecondary }]}>
                    Field Engineer (AUTHORITY)
                  </Text>
                  {role === "AUTHORITY" && <Text style={[styles.activeTag, { color: colors.warning }]}>ACTIVE</Text>}
                </View>
                <Text style={[styles.roleDesc, { color: colors.muted }]}>
                  View assigned tickets, acknowledge, start work, upload repair proof, resolve.
                </Text>
              </View>
            </Pressable>

            <Pressable
              testID="switch-to-admin-btn"
              onPress={() => handleRoleSwitch("ADMIN")}
              style={[
                styles.roleOptionCard,
                { borderColor: role === "ADMIN" ? colors.brandPrimary : colors.border },
                role === "ADMIN" && { backgroundColor: colors.surfaceTertiary },
              ]}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: "#EDE9FE" }]}>
                <Ionicons name="shield-checkmark" size={20} color="#6D28D9" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.roleCardTitleRow}>
                  <Text style={[styles.roleName, { color: colors.onSurfaceSecondary }]}>
                    City Director (ADMIN)
                  </Text>
                  {role === "ADMIN" && <Text style={[styles.activeTag, { color: "#6D28D9" }]}>ACTIVE</Text>}
                </View>
                <Text style={[styles.roleDesc, { color: colors.muted }]}>
                  Municipal overview, assign/reassign authorities, close complaints, governance.
                </Text>
              </View>
            </Pressable>

            <Pressable
              testID="logout-btn"
              onPress={async () => {
                setModalVisible(false);
                await logout();
              }}
              style={[styles.logoutBtn, { borderColor: colors.error }]}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
              <Text style={[styles.logoutText, { color: colors.error }]}>Log Out Current Session</Text>
            </Pressable>
          </View>
        </View>
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
  switchBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  switchBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
  roleOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  roleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  roleName: {
    fontSize: 14,
    fontWeight: "700",
  },
  activeTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  roleDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
