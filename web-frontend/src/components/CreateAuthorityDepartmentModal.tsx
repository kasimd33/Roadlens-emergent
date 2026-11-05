import React, { useState } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CreateAuthorityDepartmentModal: React.FC<Props> = ({ visible, onClose }) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [coverage, setCoverage] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setZone("");
    setCoverage("");
    setPhone("");
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      api.createAuthority({
        name,
        zone,
        coverage_area: coverage || undefined,
        contact_phone: phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authorities"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      reset();
      onClose();
    },
    onError: (e: Error) => setError(e?.message || "Could not create department."),
  });

  if (!visible) return null;

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) return setError("Enter the department name.");
    if (!zone.trim()) return setError("Enter the coverage zone.");
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-void/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-carbon w-full sm:max-w-md rounded-t-xl sm:rounded-xl border border-graphite shadow-xl p-5 max-h-[92svh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-medium text-paper">New Authority Department</h3>
          <button onClick={onClose} className="p-1 text-ash hover:text-mist">
            <X size={22} />
          </button>
        </div>
        <p className="text-xs text-fog mt-1 mb-4">
          Create a municipal division that complaints in this zone will be auto-assigned to.
        </p>

        <label className="block text-xs font-medium text-mist mb-1.5">Department Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Eastside Roads & Works Division"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist placeholder:text-fog focus:outline-none focus:border-mist"
        />

        <label className="block text-xs font-medium text-mist mb-1.5 mt-4">Coverage Zone</label>
        <input
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="e.g. East District & Riverside"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist placeholder:text-fog focus:outline-none focus:border-mist"
        />

        <label className="block text-xs font-medium text-mist mb-1.5 mt-4">Coverage Area (optional)</label>
        <input
          value={coverage}
          onChange={(e) => setCoverage(e.target.value)}
          placeholder="e.g. East Ave, River Rd, 20th - 40th St"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist placeholder:text-fog focus:outline-none focus:border-mist"
        />

        <label className="block text-xs font-medium text-mist mb-1.5 mt-4">Contact Phone (optional)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 80 1234 5678"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist placeholder:text-fog focus:outline-none focus:border-mist"
        />

        {error && <p className="text-xs font-medium text-coral-red mt-3" role="alert">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="w-full h-12 rounded-md bg-acid-lime text-void text-[15px] font-medium mt-5 hover:brightness-90 disabled:opacity-80 flex items-center justify-center"
        >
          {mutation.isPending ? "Creating…" : "Create Department"}
        </button>
      </div>
    </div>
  );
};
