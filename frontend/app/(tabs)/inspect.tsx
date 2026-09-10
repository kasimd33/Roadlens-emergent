import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api/client";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { DemoRoleBanner } from "@/src/components/DemoRoleBanner";
import { SeverityBadge } from "@/src/components/SeverityBadge";
import { BoundingBoxView } from "@/src/components/BoundingBoxView";
import { InspectionResult } from "@/src/types";
import Ionicons from "@react-native-vector-icons/ionicons";

// Pre-curated high-res civic road damage samples for immediate one-tap testing
const PRESET_SAMPLES = [
  {
    id: "pothole",
    name: "Deep Pothole",
    tag: "High Hazard",
    url: "https://images.unsplash.com/photo-1709934730506-fba12664d4e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwzfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
    location: "Market St & 5th St, Downtown",
    lat: 37.7833,
    lng: -122.4089,
  },
  {
    id: "crack",
    name: "Road Crack",
    tag: "Medium Hazard",
    url: "https://images.unsplash.com/photo-1635068741358-ab1b9813623f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
    location: "North Metro Blvd, Mile 12",
    lat: 37.8044,
    lng: -122.4201,
  },
  {
    id: "surface",
    name: "Surface Wear",
    tag: "Low Hazard",
    url: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxhc3BoYWx0JTIwcm9hZCUyMHJlcGFpcnxlbnwwfHx8fDE3ODkwNTU1OTd8MA&ixlib=rb-4.1.0&q=85",
    location: "South Industrial Access Rd",
    lat: 37.7312,
    lng: -122.3899,
  },
  {
    id: "clean",
    name: "Clean Pavement",
    tag: "No Damage",
    url: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxjbGVhbiUyMHJvYWR8ZW58MHx8fHwxNzg5MDU2MzA4fDA&ixlib=rb-4.1.0&q=85",
    location: "Civic Center Parkway",
    lat: 37.7792,
    lng: -122.4191,
  },
];

export default function InspectScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Selected Image & Location state
  const [selectedImage, setSelectedImage] = useState<string>(PRESET_SAMPLES[0].url);
  const [isBase64, setIsBase64] = useState(false);
  const [locationName, setLocationName] = useState(PRESET_SAMPLES[0].location);
  const [latitude, setLatitude] = useState(PRESET_SAMPLES[0].lat);
  const [longitude, setLongitude] = useState(PRESET_SAMPLES[0].lng);
  const [gpsStatus, setGpsStatus] = useState("GPS Synced");

  // AI Analysis state
  const [analysisResult, setAnalysisResult] = useState<InspectionResult | null>(null);

  // Complaint form state
  const [complaintTitle, setComplaintTitle] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [submittedSuccessId, setSubmittedSuccessId] = useState<string | null>(null);

  // Extract Real GPS if available
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            setLatitude(loc.coords.latitude);
            setLongitude(loc.coords.longitude);
            setGpsStatus("Real GPS Locked");
          }
        }
      } catch (e) {
        console.warn("Location error:", e);
      }
    })();
  }, []);

  // AI Inspection Mutation
  const analyzeMutation = useMutation({
    mutationFn: (body: any) => api.analyzeImage(body),
    onSuccess: (data: InspectionResult) => {
      setAnalysisResult(data);
      if (data.detected) {
        setComplaintTitle(`${data.damage_type} at ${locationName}`);
        setComplaintDesc(data.severity_reason || "Road damage detected via AI scan.");
      } else {
        setComplaintTitle("");
        setComplaintDesc("");
      }
    },
  });

  const handleRunAiAnalysis = async () => {
    setSubmittedSuccessId(null);
    analyzeMutation.mutate({
      image_base64: isBase64 ? selectedImage : undefined,
      image_url: !isBase64 ? selectedImage : undefined,
      latitude,
      longitude,
      location_name: locationName,
      source_type: isBase64 ? "user_upload" : "preset_sample",
    });
  };

  const handlePickGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
          setIsBase64(true);
        } else {
          setSelectedImage(asset.uri);
          setIsBase64(false);
        }
        setAnalysisResult(null);
      }
    } catch (e) {
      console.warn("Gallery pick error:", e);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
          setIsBase64(true);
        } else {
          setSelectedImage(asset.uri);
          setIsBase64(false);
        }
        setAnalysisResult(null);
      }
    } catch (e) {
      console.warn("Camera error:", e);
    }
  };

  const handleSelectPreset = (sample: (typeof PRESET_SAMPLES)[0]) => {
    setSelectedImage(sample.url);
    setIsBase64(false);
    setLocationName(sample.location);
    setLatitude(sample.lat);
    setLongitude(sample.lng);
    setAnalysisResult(null);
    setSubmittedSuccessId(null);
  };

  // Submit Complaint Mutation
  const handleSubmitComplaint = async () => {
    if (!analysisResult) return;
    setIsSubmittingComplaint(true);
    try {
      const newComp = await api.createComplaint({
        inspection_id: analysisResult.id,
        title: complaintTitle || `${analysisResult.damage_type} at ${locationName}`,
        description: complaintDesc || analysisResult.severity_reason,
        damage_type: analysisResult.damage_type,
        severity: analysisResult.severity,
        confidence: analysisResult.confidence,
        bounding_box: analysisResult.bounding_box,
        image_url: !isBase64 ? selectedImage : undefined,
        image_base64: isBase64 ? selectedImage : undefined,
        latitude,
        longitude,
        location_name: locationName,
        landmark,
      });

      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      setSubmittedSuccessId(newComp.id);
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      {/* Top Safe Area Container + Role Switcher */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.brand }}>
        <DemoRoleBanner />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.onSurfaceSecondary }]}>
              AI Road Damage Scanner
            </Text>
            <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
              Capture or select a road image to perform AI vision inspection
            </Text>
          </View>
        </View>

        {/* Preset Samples Selector Bar */}
        <View style={styles.presetsSection}>
          <Text style={[styles.sectionLabel, { color: colors.onSurfaceSecondary }]}>
            1. Select Test Image or Capture Live:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            {PRESET_SAMPLES.map((sample) => {
              const isSelected = selectedImage === sample.url;
              return (
                <Pressable
                  key={sample.id}
                  testID={`preset-btn-${sample.id}`}
                  onPress={() => handleSelectPreset(sample)}
                  style={[
                    styles.presetPill,
                    {
                      borderColor: isSelected ? colors.brandPrimary : colors.border,
                      backgroundColor: isSelected ? colors.brandTertiary : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      { color: isSelected ? colors.onBrandTertiary : colors.onSurfaceSecondary },
                    ]}
                  >
                    {sample.name}
                  </Text>
                  <Text style={[styles.presetPillTag, { color: isSelected ? colors.brandPrimary : colors.muted }]}>
                    {sample.tag}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Camera & Gallery Buttons */}
          <View style={styles.captureButtonsRow}>
            <Pressable
              testID="take-photo-btn"
              onPress={handleCameraCapture}
              style={[styles.captureBtn, { backgroundColor: colors.brandPrimary }]}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.captureBtnText}>Live Camera</Text>
            </Pressable>

            <Pressable
              testID="choose-gallery-btn"
              onPress={handlePickGallery}
              style={[styles.captureBtn, { backgroundColor: colors.brandSecondary }]}
            >
              <Ionicons name="images" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.captureBtnText}>Upload Photo</Text>
            </Pressable>
          </View>
        </View>

        {/* Viewfinder Preview with Live Bounding Box */}
        <View style={styles.viewfinderCard}>
          <Text style={[styles.sectionLabel, { color: colors.onSurfaceSecondary }]}>
            2. Visual Frame & GPS Coordinates:
          </Text>
          <BoundingBoxView
            imageUrl={!isBase64 ? selectedImage : undefined}
            imageBase64={isBase64 ? selectedImage : undefined}
            boundingBox={analysisResult?.bounding_box}
            damageType={analysisResult?.damage_type}
            confidence={analysisResult?.confidence}
            severity={analysisResult?.severity}
            height={240}
          />

          {/* GPS Location Bar */}
          <View style={[styles.locationBar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="location" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationText, { color: colors.onSurfaceSecondary }]}>
                {locationName}
              </Text>
              <Text style={[styles.gpsMeta, { color: colors.muted }]}>
                {gpsStatus} • Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)} • {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Trigger AI Analysis Button */}
        <Pressable
          testID="run-ai-scan-btn"
          onPress={handleRunAiAnalysis}
          disabled={analyzeMutation.isPending}
          style={({ pressed }) => [
            styles.runAiBtn,
            { backgroundColor: colors.brand, opacity: analyzeMutation.isPending || pressed ? 0.85 : 1 },
          ]}
        >
          {analyzeMutation.isPending ? (
            <>
              <ActivityIndicator color="#FFFFFF" style={{ marginRight: 10 }} />
              <Text style={styles.runAiBtnText}>GPT-5.4 Vision Scanning Pavement...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.runAiBtnText}>Run AI Road-Damage Analysis</Text>
            </>
          )}
        </Pressable>

        {/* AI Analysis Error State */}
        {analyzeMutation.isError && !analyzeMutation.isPending && (
          <View
            testID="ai-analysis-error-container"
            style={[styles.errorCard, { backgroundColor: "#FEE2E2", borderColor: colors.error }]}
          >
            <Ionicons name="warning" size={22} color={colors.error} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorTitle, { color: colors.error }]}>AI Analysis Failed</Text>
              <Text style={[styles.errorSub, { color: colors.error }]}>
                {(analyzeMutation.error as Error)?.message ||
                  "Unable to analyze the image right now. Please try again."}
              </Text>
            </View>
            <Pressable
              testID="retry-ai-scan-btn"
              onPress={handleRunAiAnalysis}
              style={[styles.retryBtn, { backgroundColor: colors.error }]}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* AI Analysis Result Section */}
        {analysisResult && (
          <View
            testID="ai-analysis-result-container"
            style={[
              styles.resultCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong },
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                <Ionicons
                  name={analysisResult.detected ? "checkmark-circle" : "close-circle"}
                  size={24}
                  color={analysisResult.detected ? colors.success : colors.muted}
                  style={{ marginRight: 8 }}
                />
                <View>
                  <Text style={[styles.resultTitle, { color: colors.onSurfaceSecondary }]}>
                    {analysisResult.damage_type}
                  </Text>
                  <Text style={[styles.resultSubtitle, { color: colors.muted }]}>
                    {analysisResult.detected
                      ? `AI Confidence: ${Math.round(analysisResult.confidence)}%`
                      : "Zero structural hazards detected"}
                  </Text>
                </View>
              </View>
              {analysisResult.detected && <SeverityBadge severity={analysisResult.severity} size="md" />}
            </View>

            {analysisResult.detected ? (
              <View style={styles.resultDetailsBody}>
                {/* Hazard Explanation */}
                <View style={[styles.explanationBox, { backgroundColor: colors.surfaceTertiary }]}>
                  <Text style={[styles.explanationLabel, { color: colors.muted }]}>
                    Hazard Assessment:
                  </Text>
                  <Text style={[styles.explanationText, { color: colors.onSurfaceSecondary }]}>
                    {analysisResult.severity_reason}
                  </Text>
                </View>

                {/* Repair Recommendation */}
                <View style={styles.recommendationRow}>
                  <Ionicons name="build-outline" size={16} color={colors.brandPrimary} style={{ marginRight: 6 }} />
                  <Text style={[styles.recommendationText, { color: colors.brandPrimary }]}>
                    Recommended: {analysisResult.recommended_action}
                  </Text>
                </View>

                {/* Priority */}
                <View style={styles.priorityRow}>
                  <Ionicons name="time-outline" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                  <Text style={[styles.priorityText, { color: colors.warning }]}>
                    Target Dispatch: {analysisResult.estimated_repair_priority}
                  </Text>
                </View>

                {/* Complaint Submission Form */}
                <View style={styles.formDivider} />
                <Text style={[styles.sectionLabel, { color: colors.onSurfaceSecondary }]}>
                  3. Submit Civic Complaint:
                </Text>

                <TextInput
                  testID="complaint-title-input"
                  value={complaintTitle}
                  onChangeText={setComplaintTitle}
                  placeholder="Complaint Title"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderColor: colors.border },
                  ]}
                />

                <TextInput
                  testID="complaint-landmark-input"
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="Specific Landmark (e.g. In front of Metro Gate 2)"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderColor: colors.border },
                  ]}
                />

                <TextInput
                  testID="complaint-desc-input"
                  value={complaintDesc}
                  onChangeText={setComplaintDesc}
                  placeholder="Additional Details / Citizen Remarks"
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={2}
                  style={[
                    styles.textInput,
                    styles.textArea,
                    { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderColor: colors.border },
                  ]}
                />

                {submittedSuccessId ? (
                  <View style={[styles.successBanner, { backgroundColor: "#DCFCE7" }]}>
                    <Ionicons name="checkmark-done" size={24} color="#15803D" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.successTitle}>Complaint Successfully Filed!</Text>
                      <Text style={styles.successSub}>
                        Ticket #{submittedSuccessId.slice(-5).toUpperCase()} auto-assigned to Demo Authority.
                      </Text>
                    </View>
                    <Pressable
                      testID="view-submitted-complaint-btn"
                      onPress={() => router.push("/(tabs)/complaints")}
                      style={[styles.trackBtn, { backgroundColor: colors.brandPrimary }]}
                    >
                      <Text style={styles.trackBtnText}>Track</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    testID="submit-complaint-btn"
                    onPress={handleSubmitComplaint}
                    disabled={isSubmittingComplaint}
                    style={({ pressed }) => [
                      styles.submitComplaintBtn,
                      { backgroundColor: colors.brandPrimary, opacity: isSubmittingComplaint || pressed ? 0.85 : 1 },
                    ]}
                  >
                    {isSubmittingComplaint ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.submitComplaintBtnText}>
                          Submit & Auto-Assign to Authority
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={[styles.noDamageNotice, { backgroundColor: colors.surfaceTertiary }]}>
                <Text style={[styles.noDamageText, { color: colors.onSurfaceTertiary }]}>
                  No supported road damage detected. The scanned surface appears structurally intact.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollBody: {
    padding: 16,
  },
  headerTitleRow: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  presetsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  presetsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  presetPill: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 110,
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  presetPillTag: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  captureButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  captureBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  viewfinderCard: {
    marginBottom: 16,
  },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "700",
  },
  gpsMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  runAiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  runAiBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  resultCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  resultSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  resultDetailsBody: {
    gap: 10,
  },
  explanationBox: {
    borderRadius: 8,
    padding: 10,
  },
  explanationLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  recommendationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "700",
  },
  formDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  textArea: {
    minHeight: 50,
    textAlignVertical: "top",
  },
  submitComplaintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 6,
  },
  submitComplaintBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  successTitle: {
    color: "#15803D",
    fontSize: 13,
    fontWeight: "800",
  },
  successSub: {
    color: "#166534",
    fontSize: 11,
    marginTop: 1,
  },
  trackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  trackBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  noDamageNotice: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  errorSub: {
    fontSize: 11,
    marginTop: 2,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  noDamageText: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
});
