import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, Redirect } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/theme";
import { UserRole } from "@/src/types";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const { user, isLoading, login, signInWithGoogle, demoLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && user) return <Redirect href="/(tabs)" />;

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      setError((e as Error).message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError((e as Error).message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemo = async (role: UserRole) => {
    setError(null);
    setSubmitting(true);
    try {
      await demoLogin(role);
    } catch (e) {
      setError((e as Error).message || "Demo login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.brand }]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand header */}
        <View style={styles.header}>
          <Ionicons name="scan-circle" size={56} color="#FFFFFF" />
          <Text style={styles.brand}>Welcome to RoadLens</Text>
          <Text style={styles.subtitle}>Sign in to report and track road damage</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Email</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={[styles.input, { color: colors.onSurface }]}
            />
          </View>

          <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Password</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={[styles.input, { color: colors.onSurface }]}
            />
            <Pressable testID="toggle-password-btn" onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
            </Pressable>
          </View>

          <Pressable
            testID="forgot-password-link"
            onPress={() => router.push("/forgot-password")}
            style={styles.forgotWrap}
          >
            <Text style={[styles.forgotText, { color: colors.brandPrimary }]}>Forgot Password?</Text>
          </Pressable>

          {error && (
            <Text testID="login-error" style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          )}

          <Pressable
            testID="login-submit-button"
            onPress={handleLogin}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.brandPrimary, opacity: submitting || pressed ? 0.85 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Login</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.divText, { color: colors.muted }]}>or</Text>
            <View style={[styles.divLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            testID="google-signin-button"
            onPress={handleGoogle}
            disabled={googleLoading}
            style={({ pressed }) => [
              styles.googleBtn,
              { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.onSurface} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
                <Text style={[styles.googleBtnText, { color: colors.onSurface }]}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable testID="go-to-signup-link" onPress={() => router.push("/signup")} style={styles.signupRow}>
            <Text style={[styles.signupText, { color: colors.muted }]}>
              Don&apos;t have an account? <Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>Sign Up</Text>
            </Text>
          </Pressable>
        </View>

        {/* Demo quick access */}
        <View style={styles.demoWrap}>
          <Text style={styles.demoLabel}>Quick demo access</Text>
          <View style={styles.demoRow}>
            <Pressable testID="demo-user-btn" onPress={() => handleDemo("USER")} style={[styles.demoChip, { borderColor: colors.brandSecondary }]}>
              <Text style={styles.demoChipText}>Citizen</Text>
            </Pressable>
            <Pressable testID="demo-authority-btn" onPress={() => handleDemo("AUTHORITY")} style={[styles.demoChip, { borderColor: colors.warning }]}>
              <Text style={styles.demoChipText}>Authority</Text>
            </Pressable>
            <Pressable testID="demo-admin-btn" onPress={() => handleDemo("ADMIN")} style={[styles.demoChip, { borderColor: colors.brandPrimary }]}>
              <Text style={styles.demoChipText}>Admin</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 24, marginBottom: 24 },
  brand: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#CBD5E1", fontSize: 13, marginTop: 4 },
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
  forgotWrap: { alignSelf: "flex-end", paddingVertical: 10 },
  forgotText: { fontSize: 12, fontWeight: "700" },
  errorText: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  primaryBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  divLine: { flex: 1, height: 1 },
  divText: { marginHorizontal: 10, fontSize: 12, fontWeight: "600" },
  googleBtn: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleBtnText: { fontSize: 14, fontWeight: "700" },
  signupRow: { alignItems: "center", marginTop: 18 },
  signupText: { fontSize: 13 },
  demoWrap: { marginTop: 22, paddingHorizontal: 20, alignItems: "center" },
  demoLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  demoRow: { flexDirection: "row", gap: 10 },
  demoChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  demoChipText: { color: "#E2E8F0", fontSize: 12, fontWeight: "700" },
});
