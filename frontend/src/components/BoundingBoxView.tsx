import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { BoundingBox } from "@/src/types";
import { useTheme } from "@/src/theme";

interface BoundingBoxViewProps {
  imageUrl?: string | null;
  imageBase64?: string | null;
  boundingBox?: BoundingBox | null;
  damageType?: string;
  confidence?: number;
  severity?: "HIGH" | "MEDIUM" | "LOW" | "NONE" | string;
  height?: number;
}

export const BoundingBoxView: React.FC<BoundingBoxViewProps> = ({
  imageUrl,
  imageBase64,
  boundingBox,
  damageType = "Road Damage",
  confidence = 92,
  severity = "HIGH",
  height = 240,
}) => {
  const { colors } = useTheme();

  const source = imageBase64
    ? { uri: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` }
    : imageUrl
    ? { uri: imageUrl }
    : require("../../assets/images/app-image.png");

  const sev = (severity || "HIGH").toUpperCase();
  const boxColor = sev === "HIGH" ? colors.error : sev === "MEDIUM" ? colors.warning : colors.success;

  const box = boundingBox || { x: 20, y: 30, width: 50, height: 35 };

  return (
    <View testID="bounding-box-container" style={[styles.container, { height }]}>
      <Image
        source={source}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />

      {/* AI Bounding Box Overlay */}
      {sev !== "NONE" && (
        <View
          testID="damage-bounding-box"
          style={[
            styles.bbox,
            {
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
              borderColor: boxColor,
              backgroundColor: `${boxColor}22`,
            },
          ]}
        >
          <View style={[styles.bboxTag, { backgroundColor: boxColor }]}>
            <Text style={styles.bboxTagText} numberOfLines={1}>
              {damageType} ({Math.round(confidence)}%)
            </Text>
          </View>
          <View style={[styles.corner, styles.cornerTL, { borderColor: boxColor }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: boxColor }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: boxColor }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: boxColor }]} />
        </View>
      )}

      {/* Live AI Overlay Stamp */}
      <View style={styles.stamp}>
        <View style={styles.pulseDot} />
        <Text style={styles.stampText}>AI VISION 5.4 SCAN</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1F2937",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  bbox: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 4,
  },
  bboxTag: {
    position: "absolute",
    top: -20,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  bboxTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  corner: {
    position: "absolute",
    width: 8,
    height: 8,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  stamp: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  stampText: {
    color: "#F9FAFB",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
