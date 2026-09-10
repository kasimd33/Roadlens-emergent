import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/theme";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const { forgotPassword, resetPassword } = useAuth();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRequest = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email.");
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setInfo("If an account exists for that email, we sent a 6-digit reset code. Check your inbox.");
      setStep("reset");
    } catch (e) {
      setError((e as Error).message || "Could not send reset code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setInfo(null);
    if (code.trim().length < 4) return setError("Enter the reset code from your email.");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    if (newPassword !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await resetPassword(email, code, newPassword);
      setInfo("Password reset! Redirecting to login...");
      setTimeout(() => router.replace("/login"), 900);
    } catch (e) {
      setError((e as Error).message || "Invalid or expired reset code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.brand }]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable testID="forgot-back-btn" onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.intro, { color: colors.muted }]}>
            {step === "request"
              ? "Enter your account email and we'll send you a verification code."
              : "Enter the code we emailed you and choose a new password."}
          </Text>

          <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Email</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              testID="forgot-email-input"
              value={email}
              onChangeText={setEmail}
              editable={step === "request"}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { color: colors.onSurface }]}
            />
          </View>

          {step === "reset" && (
            <>
              <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Reset Code</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="keypad-outline" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  testID="reset-code-input"
                  value={code}
                  onChangeText={setCode}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={[styles.input, { color: colors.onSurface, letterSpacing: 4 }]}
                />
              </View>

              <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>New Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  testID="reset-new-password-input"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.onSurface }]}
                />
              </View>

              <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Confirm New Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  testID="reset-confirm-input"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.onSurface }]}
                />
              </View>
            </>
          )}

          {info && (
            <Text testID="forgot-info" style={[styles.infoText, { color: colors.success }]}>
              {info}
            </Text>
          )}
          {error && (
            <Text testID="forgot-error" style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          )}

          <Pressable
            testID={step === "request" ? "send-reset-code-button" : "confirm-reset-button"}
            onPress={step === "request" ? handleRequest : handleReset}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.brandPrimary, opacity: submitting || pressed ? 0.85 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{step === "request" ? "Send Reset Code" : "Reset Password"}</Text>
            )}
          </Pressable>

          <Pressable testID="back-to-login-link" onPress={() => router.replace("/login")} style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.brandPrimary }]}>Back to Login</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  intro: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 6, marginTop: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, height: "100%" },
  infoText: { fontSize: 12, fontWeight: "600", marginTop: 12 },
  errorText: { fontSize: 12, fontWeight: "600", marginTop: 12 },
  primaryBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  loginRow: { alignItems: "center", marginTop: 16 },
  loginText: { fontSize: 13, fontWeight: "700" },
});
