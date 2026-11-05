import React from "react";
import type { BoundingBox } from "../types";

interface BoundingBoxViewProps {
  imageUrl?: string | null;
  imageBase64?: string | null;
  boundingBox?: BoundingBox | null;
  damageType?: string;
  confidence?: number;
  severity?: string;
  height?: number;
}

export const BoundingBoxView: React.FC<BoundingBoxViewProps> = ({
  imageUrl, imageBase64, boundingBox, damageType = "Road Damage",
  confidence = 92, severity = "HIGH", height = 240,
}) => {
  const src = imageBase64
    ? (imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`)
    : imageUrl || "https://images.unsplash.com/photo-1709934730506-fba12664d4e4?w=800&q=80";

  const sev = (severity || "HIGH").toUpperCase();
  const boxColor = sev === "HIGH" ? "#DC2626" : sev === "MEDIUM" ? "#D97706" : "#16A34A";
  const box = boundingBox || { x: 0, y: 0, width: 0, height: 0 };
  // Never draw a box the model didn't actually produce (no fabricated detections)
  const showBox = !!boundingBox && sev !== "NONE";

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-gray-900" style={{ height }}>
      <img src={src} alt="Road inspection" className="w-full h-full object-contain bg-gray-900" />
      {showBox && (
        <div
          className="absolute border-2 border-dashed rounded"
          style={{
            left: `${box.x}%`, top: `${box.y}%`,
            width: `${box.width}%`, height: `${box.height}%`,
            borderColor: boxColor, backgroundColor: `${boxColor}22`,
          }}
        >
          <span
            className="absolute -top-5 left-0 text-white text-[10px] font-black uppercase px-1.5 py-0.5 rounded"
            style={{ backgroundColor: boxColor }}
          >
            {damageType} ({Math.round(confidence)}%)
          </span>
          {/* Corner markers */}
          {[["top-0 left-0 border-t-2 border-l-2",""],["top-0 right-0 border-t-2 border-r-2",""],
            ["bottom-0 left-0 border-b-2 border-l-2",""],["bottom-0 right-0 border-b-2 border-r-2",""]].map(([cls], i) => (
            <div key={i} className={`absolute w-2 h-2 ${cls}`} style={{ borderColor: boxColor }} />
          ))}
        </div>
      )}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-gray-900/85 px-2 py-1 rounded text-[9px] font-black text-gray-100 uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        AI VISION 5.4 SCAN
      </div>
    </div>
  );
};
