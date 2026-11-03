import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, Redirect } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/theme";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const { user, isLoading, signup, signInWithGoogle } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && user) return <Redirect href="/(tabs)" />;

  const handleSignup = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await signup(email, password, name);
    } catch (e) {
      setError((e as Error).message || "Sign up failed. Please try again.");
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.brand }]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable testID="signup-back-btn" onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Name</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              testID="signup-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.onSurface }]}
            />
          </View>

          <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Email</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              testID="signup-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { color: colors.onSurface }]}
            />
          </View>

          <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Password</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              testID="signup-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={[styles.input, { color: colors.onSurface }]}
            />
            <Pressable testID="toggle-signup-password-btn" onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: colors.onSurfaceSecondary }]}>Confirm Password</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              testID="signup-confirm-input"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={[styles.input, { color: colors.onSurface }]}
            />
          </View>

          {error && (
            <Text testID="signup-error" style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          )}

          <Pressable
            testID="signup-submit-button"
            onPress={handleSignup}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.brandPrimary, opacity: submitting || pressed ? 0.85 : 1 },
            ]}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.divText, { color: colors.muted }]}>or</Text>
            <View style={[styles.divLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            testID="google-signup-button"
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

          <Pressable testID="go-to-login-link" onPress={() => router.replace("/login")} style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.muted }]}>
              Already have an account? <Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>Login</Text>
            </Text>
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
  errorText: { fontSize: 12, fontWeight: "600", marginTop: 12 },
  primaryBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
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
  loginRow: { alignItems: "center", marginTop: 18 },
  loginText: { fontSize: 13 },
});
