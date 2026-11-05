import React, { useState, useRef } from "react";
import { X, Camera, ImagePlus, CheckCircle, CheckCheck } from "lucide-react";
import { fileToBase64DataUrl } from "../utils/image";

interface RepairModalProps {
  complaintTitle: string;
  complaintId: string;
  onClose: () => void;
  onSubmit: (data: { notes: string; repairImageBase64?: string; repairImageUrl?: string }) => Promise<void>;
}

const SAMPLE_REPAIR_PHOTOS = [
  {
    name: "Asphalt Patch",
    url: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxhc3BoYWx0JTIwcm9hZCUyMHJlcGFpcnxlbnwwfHx8fDE3ODkwNTU1OTd8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    name: "Crack Sealant",
    url: "https://images.unsplash.com/photo-1635068741358-ab1b9813623f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
  },
];

export const RepairModal: React.FC<RepairModalProps> = ({
  complaintTitle,
  complaintId,
  onClose,
  onSubmit,
}) => {
  const [notes, setNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_REPAIR_PHOTOS[0].url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setImageError(null);
    try {
      setSelectedImage(await fileToBase64DataUrl(file));
    } catch (err) {
      setImageError((err as Error).message || "Could not process the selected image.");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const isB64 = selectedImage?.startsWith("data:");
      await onSubmit({
        notes: notes || "Road surface restored and compacted. Hazard eliminated.",
        repairImageBase64: isB64 ? selectedImage || undefined : undefined,
        repairImageUrl: !isB64 ? selectedImage || undefined : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-void/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-carbon w-full sm:max-w-lg rounded-t-xl sm:rounded-xl border border-graphite shadow-xl p-5 max-h-[92svh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 pr-2">
            <h3 className="text-lg font-medium text-paper">Complete Repair &amp; Upload Proof</h3>
            <p className="text-xs text-fog mt-0.5 truncate font-berkeley-mono">
              Ticket #{complaintId.slice(-5)?.toUpperCase() || complaintId}: {complaintTitle}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-ash hover:text-mist shrink-0">
            <X size={22} />
          </button>
        </div>

        {/* Proof-of-fix photo evidence */}
        <p className="text-[13px] font-medium text-paper mb-2">Proof-of-Fix Photo Evidence:</p>
        {selectedImage ? (
          <div className="relative h-40 rounded-xl overflow-hidden border border-graphite">
            <img src={selectedImage} alt="Repair proof" className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-acid-lime text-void text-[10px] font-medium px-2 py-1 rounded-sm">
              <CheckCircle size={14} /> PROOF ATTACHED
            </span>
          </div>
        ) : (
          <div className="h-28 border border-dashed border-smoke rounded-xl flex flex-col items-center justify-center">
            <Camera size={36} className="text-ash" />
            <p className="text-xs text-fog mt-1.5">No repair photo selected</p>
          </div>
        )}

        <div className="flex gap-2.5 mt-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-paper text-void text-[13px] font-medium rounded-md py-2.5 hover:brightness-90"
          >
            <Camera size={16} /> Take Photo
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 border border-graphite text-mist text-[13px] font-normal rounded-md py-2.5 hover:border-smoke"
          >
            <ImagePlus size={16} /> Gallery
          </button>
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

        {/* Demo proof samples */}
        <div className="flex items-center flex-wrap gap-2 mt-3">
          <span className="text-[11px] font-normal text-fog">Demo Proof Samples:</span>
          {SAMPLE_REPAIR_PHOTOS.map((p, i) => {
            const isSelected = selectedImage === p.url;
            return (
              <button
                key={i}
                onClick={() => setSelectedImage(p.url)}
                className={`border rounded-md px-2 py-1 text-[11px] font-normal transition-colors ${
                  isSelected
                    ? "border-acid-lime text-acid-lime"
                    : "border-graphite text-mist hover:border-smoke"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        {/* Notes */}
        <p className="text-[13px] font-medium text-paper mt-4 mb-2">Field Work Completion Notes:</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Cleared debris, applied 50mm hot asphalt layer, compacted with hydraulic roller."
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-[13px] text-mist placeholder:text-fog focus:outline-none focus:border-mist resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-acid-lime text-void text-[15px] font-medium rounded-md py-3.5 mt-4 hover:brightness-90 disabled:opacity-80"
        >
          {isSubmitting ? (
            "Submitting…"
          ) : (
            <>
              <CheckCheck size={20} /> Confirm &amp; Mark Resolved
            </>
          )}
        </button>
      </div>
    </div>
  );
};
