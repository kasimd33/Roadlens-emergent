import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/theme";

export default function Index() {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View testID="splash-screen" style={[styles.splash, { backgroundColor: colors.brand }]}>
        <View style={styles.logoWrap}>
          <Ionicons name="scan-circle" size={72} color="#FFFFFF" />
        </View>
        <Text style={styles.brand}>RoadLens</Text>
        <Text style={styles.tagline}>AI Road Damage & Civic Reporting</Text>
        <ActivityIndicator color="#FFFFFF" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logoWrap: {
    marginBottom: 8,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tagline: {
    color: "#CBD5E1",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
});
