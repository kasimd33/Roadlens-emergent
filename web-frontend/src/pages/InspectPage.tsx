import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Sparkles, Loader2, AlertTriangle, CheckCircle2, XCircle, Wrench, Clock, Send, CheckCheck, MapPin, IndianRupee } from "lucide-react";
import { api } from "../api/client";
import { SeverityBadge } from "../components/SeverityBadge";
import { BoundingBoxView } from "../components/BoundingBoxView";
import { fileToBase64DataUrl } from "../utils/image";
import type { InspectionResult } from "../types";

// Pre-curated high-res civic road damage samples for immediate one-tap testing
const PRESET_SAMPLES = [
  {
    id: "pothole",
    name: "Deep Pothole",
    tag: "High Hazard",
    url: "https://images.unsplash.com/photo-1709934730506-fba12664d4e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwzfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
    location: "Gandhi Nagar Main Road & Court Circle, Ballari, Karnataka",
    lat: 15.139,
    lng: 76.921,
  },
  {
    id: "crack",
    name: "Road Crack",
    tag: "Medium Hazard",
    url: "https://images.unsplash.com/photo-1635068741358-ab1b9813623f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
    location: "Hospet Road (NH-50), Kudithini, Ballari, Karnataka",
    lat: 15.205,
    lng: 76.893,
  },
  {
    id: "surface",
    name: "Surface Wear",
    tag: "Low Hazard",
    url: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxhc3BoYWx0JTIwcm9hZCUyMHJlcGFpcnxlbnwwfHx8fDE3ODkwNTU1OTd8MA&ixlib=rb-4.1.0&q=85",
    location: "Kappagal Road Industrial Area, Ballari, Karnataka",
    lat: 15.105,
    lng: 76.91,
  },
  {
    id: "clean",
    name: "Clean Pavement",
    tag: "No Damage",
    url: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxjbGVhbiUyMHJvYWR8ZW58MHx8fHwxNzg5MDU2MzA4fDA&ixlib=rb-4.1.0&q=85",
    location: "DC Office Approach Rd, Ballari, Karnataka",
    lat: 15.137,
    lng: 76.918,
  },
];

export const InspectPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Selected image & location state
  const [selectedImage, setSelectedImage] = useState<string>(PRESET_SAMPLES[0].url);
  const [isBase64, setIsBase64] = useState(false);
  const [locationName, setLocationName] = useState(PRESET_SAMPLES[0].location);
  const [latitude, setLatitude] = useState(PRESET_SAMPLES[0].lat);
  const [longitude, setLongitude] = useState(PRESET_SAMPLES[0].lng);
  const [gpsStatus, setGpsStatus] = useState("Locating GPS…");
  const [gpsTime, setGpsTime] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLive, setGpsLive] = useState(false);
  const gpsLiveRef = useRef(false);
  // Whether the user has typed a custom location name (never overwrite it then)
  const locationTouchedRef = useRef(false);
  const lastGeocodeRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // AI analysis state
  const [analysisResult, setAnalysisResult] = useState<InspectionResult | null>(null);

  // Complaint form state
  const [complaintTitle, setComplaintTitle] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedSuccessId, setSubmittedSuccessId] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Reverse geocode coordinates into a human-readable place name (OpenStreetMap,
  // free, no key). Throttled and skipped once the user edits the field.
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17`,
        { headers: { "Accept-Language": "en" } },
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      const a = data.address || {};
      const parts = [
        a.road,
        a.neighbourhood || a.suburb,
        a.city || a.town || a.village || a.county,
        a.state,
      ].filter(Boolean);
      return parts.length
        ? parts.join(", ")
        : (data.display_name || "").split(",").slice(0, 3).join(", ") || null;
    } catch {
      return null;
    }
  };

  // Live GPS tracking via the browser Geolocation API — continuous position
  // updates while the Inspect page is open (not a one-shot fix).
  useEffect(() => {
    setGpsTime(new Date().toLocaleTimeString());
    if (!("geolocation" in navigator)) {
      setGpsStatus("GPS not supported by this browser — using sample coordinates");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        gpsLiveRef.current = true;
        setGpsLive(true);
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsAccuracy(pos.coords.accuracy);
        setGpsStatus("Real GPS Locked (live)");
        setGpsTime(new Date().toLocaleTimeString());

        // Auto-fill the location name from the real position (until the user
        // types their own), throttled to one reverse-geocode per ~15s or ~100m.
        if (!locationTouchedRef.current) {
          const last = lastGeocodeRef.current;
          const movedFar =
            !last ||
            Math.abs(pos.coords.latitude - last.lat) + Math.abs(pos.coords.longitude - last.lng) > 0.001;
          const enoughTime = !last || Date.now() - last.at > 15_000;
          if (movedFar || enoughTime) {
            lastGeocodeRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() };
            reverseGeocode(pos.coords.latitude, pos.coords.longitude).then((name) => {
              if (name && !locationTouchedRef.current) setLocationName(name);
            });
          }
        }
      },
      (err) => {
        gpsLiveRef.current = false;
        setGpsLive(false);
        setGpsAccuracy(null);
        setGpsStatus(
          err.code === err.PERMISSION_DENIED
            ? "GPS permission denied — using sample coordinates"
            : "GPS unavailable — using sample coordinates",
        );
        setGpsTime(new Date().toLocaleTimeString());
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setImageError(null);
    try {
      const dataUrl = await fileToBase64DataUrl(file);
      setSelectedImage(dataUrl);
      setIsBase64(true);
      setAnalysisResult(null);
      setSubmittedSuccessId(null);
    } catch (err) {
      setImageError((err as Error).message || "Could not process the selected image.");
    }
  };

  const analyzeMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.analyzeImage(body),
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

  const handleRunAiAnalysis = () => {
    setSubmittedSuccessId(null);
    setSubmitError(null);
    analyzeMutation.mutate({
      image_base64: isBase64 ? selectedImage : undefined,
      image_url: !isBase64 ? selectedImage : undefined,
      latitude,
      longitude,
      location_name: locationName,
      source_type: isBase64 ? "user_upload" : "preset_sample",
    });
  };

  const handleSelectPreset = (sample: (typeof PRESET_SAMPLES)[0]) => {
    setSelectedImage(sample.url);
    setIsBase64(false);
    setLocationName(sample.location);
    if (!gpsLiveRef.current) {
      // Only fall back to the sample's demo coordinates when we have no live GPS fix
      setLatitude(sample.lat);
      setLongitude(sample.lng);
      setGpsStatus("Sample coordinates (demo)");
      setGpsTime(new Date().toLocaleTimeString());
    }
    setAnalysisResult(null);
    setSubmittedSuccessId(null);
    setSubmitError(null);
  };

  const handleSubmitComplaint = async () => {
    if (!analysisResult) return;
    setIsSubmittingComplaint(true);
    setSubmitError(null);
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
    } catch (err) {
      setSubmitError((err as Error).message || "Could not file the complaint.");
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-medium text-paper tracking-[-0.012em]">AI Road Damage Scanner</h1>
        <p className="text-xs text-fog mt-1">
          Capture or select a road image to perform AI vision inspection
        </p>
      </div>

      {/* 1. Sample / capture selection */}
      <section>
        <h2 className="text-[13px] font-medium text-paper mb-2">
          1. Select Test Image or Capture Live:
        </h2>
        <div className="flex flex-wrap gap-2">
          {PRESET_SAMPLES.map((sample) => {
            const isSelected = !isBase64 && selectedImage === sample.url;
            return (
              <button
                key={sample.id}
                onClick={() => handleSelectPreset(sample)}
                className={`border rounded-md px-3 py-2 text-left min-w-[110px] transition-colors bg-white/[0.02] ${
                  isSelected
                    ? "border-acid-lime"
                    : "border-graphite hover:border-smoke"
                }`}
              >
                <span className={`block text-xs font-medium ${isSelected ? "text-paper" : "text-mist"}`}>
                  {sample.name}
                </span>
                <span className={`block text-[10px] font-medium mt-0.5 ${isSelected ? "text-acid-lime" : "text-fog"}`}>
                  {sample.tag}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 mt-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 border border-graphite text-mist text-[13px] font-medium rounded-md py-2.5 hover:border-smoke"
          >
            <Camera size={18} /> Live Camera
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 border border-graphite text-mist text-[13px] font-medium rounded-md py-2.5 hover:border-smoke"
          >
            <ImagePlus size={18} /> Upload Photo
          </button>
          {/* Hidden file inputs: capture attr opens the rear camera on mobile web */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {imageError && (
          <p className="text-xs font-medium text-coral-red mt-2" role="alert">{imageError}</p>
        )}
      </section>

      {/* 2. Preview + GPS */}
      <section>
        <h2 className="text-[13px] font-medium text-paper mb-2">
          2. Visual Frame &amp; GPS Coordinates:
        </h2>
        <BoundingBoxView
          imageUrl={!isBase64 ? selectedImage : undefined}
          imageBase64={isBase64 ? selectedImage : undefined}
          boundingBox={analysisResult?.bounding_box ?? null}
          damageType={analysisResult?.damage_type}
          confidence={analysisResult?.confidence}
          severity={analysisResult?.severity}
          height={260}
        />

        <div className="flex items-center border border-white/[0.08] bg-white/[0.02] rounded-md p-3 mt-2.5">
          <MapPin size={18} className="text-ash mr-2 shrink-0" />
          <div className="flex-1 min-w-0">
            <input
              value={locationName}
              onChange={(e) => {
                setLocationName(e.target.value);
                locationTouchedRef.current = true;
              }}
              placeholder="Location name"
              className="w-full text-xs font-medium text-mist outline-none bg-transparent"
            />
            <p className="text-[10px] mt-0.5 truncate">
              <span className={gpsLive ? "text-paper font-medium" : "text-fog font-medium"}>
                {gpsStatus}
              </span>
              {gpsAccuracy != null ? ` • ±${gpsAccuracy.toFixed(0)}m` : ""} • Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
              {gpsTime ? ` • ${gpsTime}` : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Run AI analysis */}
      <button
        onClick={handleRunAiAnalysis}
        disabled={analyzeMutation.isPending}
        className="w-full flex items-center justify-center gap-2 bg-acid-lime text-void text-[15px] font-medium rounded-md py-3.5 hover:brightness-90 disabled:opacity-85"
      >
        {analyzeMutation.isPending ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            GPT-5.4 Vision Scanning Pavement...
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Run AI Road-Damage Analysis
          </>
        )}
      </button>

      {/* AI failure state — honest error, retry offered */}
      {analyzeMutation.isError && (
        <div className="flex items-center gap-3 bg-coral-red/10 border border-coral-red/30 rounded-md p-3">
          <AlertTriangle size={22} className="text-coral-red shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-paper">AI Analysis Failed</p>
            <p className="text-[11px] text-mist mt-0.5">
              {(analyzeMutation.error as Error)?.message ||
                "Unable to analyze the image right now. Please try again."}
            </p>
          </div>
          <button
            onClick={handleRunAiAnalysis}
            className="border border-graphite text-mist text-xs font-medium rounded-md px-4 py-2 hover:border-smoke shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* AI analysis result */}
      {analysisResult && (
        <section className="bg-carbon border border-graphite rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {analysisResult.detected ? (
                <CheckCircle2 size={24} className="text-acid-lime shrink-0" />
              ) : (
                <XCircle size={24} className="text-ash shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-base font-medium text-paper truncate">{analysisResult.damage_type}</p>
                <p className="text-xs text-fog">
                  {analysisResult.detected
                    ? `AI Confidence: ${Math.round(analysisResult.confidence)}%`
                    : "Zero structural hazards detected"}
                </p>
              </div>
            </div>
            {analysisResult.detected && <SeverityBadge severity={analysisResult.severity} size="md" />}
          </div>

          {analysisResult.detected ? (
            <div className="space-y-3">
              <div className="bg-obsidian rounded-md p-3">
                <p className="text-[10px] font-medium text-fog uppercase mb-1">Hazard Assessment:</p>
                <p className="text-xs text-mist leading-relaxed">{analysisResult.severity_reason}</p>
              </div>

              <p className="flex items-center gap-1.5 text-xs font-medium text-paper">
                <Wrench size={16} />
                Recommended: {analysisResult.recommended_action}
              </p>
              <p className="flex items-center gap-1.5 text-xs font-medium text-acid-lime">
                <Clock size={16} />
                Target Dispatch: {analysisResult.estimated_repair_priority}
              </p>
              {analysisResult.estimated_cost_inr && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-paper">
                  <IndianRupee size={16} />
                  Est. Repair Cost: ₹{analysisResult.estimated_cost_inr.replace(/^₹/, "")}
                </p>
              )}

              <div className="h-px bg-graphite" />

              <h3 className="text-[13px] font-medium text-paper">3. Submit Civic Complaint:</h3>

              <input
                value={complaintTitle}
                onChange={(e) => setComplaintTitle(e.target.value)}
                placeholder="Complaint Title"
                className="w-full border border-white/[0.08] rounded-md px-3 py-2.5 text-[13px] bg-white/[0.02] text-mist placeholder:text-fog focus:outline-none focus:border-mist"
              />
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Specific Landmark (e.g. In front of Metro Gate 2)"
                className="w-full border border-white/[0.08] rounded-md px-3 py-2.5 text-[13px] bg-white/[0.02] text-mist placeholder:text-fog focus:outline-none focus:border-mist"
              />
              <textarea
                value={complaintDesc}
                onChange={(e) => setComplaintDesc(e.target.value)}
                placeholder="Additional Details / Citizen Remarks"
                rows={2}
                className="w-full border border-white/[0.08] rounded-md px-3 py-2.5 text-[13px] bg-white/[0.02] text-mist placeholder:text-fog focus:outline-none focus:border-mist resize-none"
              />

              {submitError && (
                <p className="text-xs font-medium text-coral-red" role="alert">{submitError}</p>
              )}

              {submittedSuccessId ? (
                <div className="flex items-center gap-2.5 bg-obsidian rounded-md p-3">
                  <CheckCheck size={24} className="text-pulse-green shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-paper">Complaint Successfully Filed!</p>
                    <p className="text-[11px] text-mist mt-0.5">
                      Ticket #{submittedSuccessId.slice(-5).toUpperCase()} auto-assigned to Authority.
                    </p>
                  </div>
                  <Link
                    to="/complaints"
                    className="bg-paper text-void text-xs font-medium rounded-full px-3 py-1.5 hover:brightness-90 shrink-0"
                  >
                    Track
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleSubmitComplaint}
                  disabled={isSubmittingComplaint}
                  className="w-full flex items-center justify-center gap-2 bg-paper text-void text-sm font-medium rounded-full py-3.5 hover:brightness-90 disabled:opacity-85"
                >
                  {isSubmittingComplaint ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Submit &amp; Auto-Assign to Authority
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-obsidian rounded-md p-4">
              <p className="text-[13px] text-mist text-center font-medium">
                No supported road damage detected. The scanned surface appears structurally intact.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
