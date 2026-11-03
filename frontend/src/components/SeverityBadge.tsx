import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";
import Ionicons from "@react-native-vector-icons/ionicons";

interface SeverityBadgeProps {
  severity: "HIGH" | "MEDIUM" | "LOW" | "NONE" | string;
  size?: "sm" | "md" | "lg";
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = "md" }) => {
  const { colors } = useTheme();

  const sev = (severity || "LOW").toUpperCase();

  let bg = colors.success;
  let text = "Low Hazard";
  let iconName = "checkmark-circle";

  if (sev === "HIGH") {
    bg = colors.error;
    text = "High Severity";
    iconName = "alert-circle";
  } else if (sev === "MEDIUM") {
    bg = colors.warning;
    text = "Medium Severity";
    iconName = "warning";
  } else if (sev === "NONE") {
    bg = colors.muted;
    text = "No Damage";
    iconName = "information-circle";
  }

  const isSmall = size === "sm";
  const isLarge = size === "lg";

  return (
    <View
      testID={`severity-badge-${sev.toLowerCase()}`}
      style={[
        styles.badge,
        { backgroundColor: bg },
        isSmall && styles.badgeSm,
        isLarge && styles.badgeLg,
      ]}
    >
      <Ionicons
        name={iconName as any}
        size={isSmall ? 12 : isLarge ? 18 : 14}
        color="#FFFFFF"
        style={{ marginRight: 4 }}
      />
      <Text
        style={[
          styles.text,
          isSmall && styles.textSm,
          isLarge && styles.textLg,
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeLg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  textSm: {
    fontSize: 10,
  },
  textLg: {
    fontSize: 14,
  },
});
