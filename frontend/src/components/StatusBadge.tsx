import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";
import { ComplaintStatus } from "@/src/types";

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const { colors } = useTheme();

  const s = (status || "SUBMITTED").toUpperCase();

  let bg = colors.brandTertiary;
  let textColor = colors.brandPrimary;
  let label = s;

  switch (s) {
    case "SUBMITTED":
      bg = "#E0E7FF";
      textColor = "#3730A3";
      label = "Submitted";
      break;
    case "ASSIGNED":
      bg = "#E0F2FE";
      textColor = "#0369A1";
      label = "Assigned";
      break;
    case "ACKNOWLEDGED":
      bg = "#FEF3C7";
      textColor = "#92400E";
      label = "Acknowledged";
      break;
    case "IN_PROGRESS":
      bg = "#FFEDD5";
      textColor = "#C2410C";
      label = "In Progress";
      break;
    case "RESOLVED":
      bg = "#DCFCE7";
      textColor = "#15803D";
      label = "Resolved";
      break;
    case "CLOSED":
      bg = "#F3F4F6";
      textColor = "#4B5563";
      label = "Closed";
      break;
  }

  const isSmall = size === "sm";

  return (
    <View
      testID={`status-badge-${s.toLowerCase()}`}
      style={[
        styles.badge,
        { backgroundColor: bg },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text style={[styles.text, { color: textColor }, isSmall && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 10,
  },
});
