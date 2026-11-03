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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92svh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-black text-gray-800">New Authority Department</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Create a municipal division that complaints in this zone will be auto-assigned to.
        </p>

        <label className="block text-xs font-black text-gray-700 mb-1.5">Department Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Eastside Roads & Works Division"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">Coverage Zone</label>
        <input
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="e.g. East District & Riverside"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">Coverage Area (optional)</label>
        <input
          value={coverage}
          onChange={(e) => setCoverage(e.target.value)}
          placeholder="e.g. East Ave, River Rd, 20th - 40th St"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">Contact Phone (optional)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 80 1234 5678"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-xs font-semibold text-red-600 mt-3" role="alert">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="w-full h-12 rounded-lg bg-blue-700 text-white text-[15px] font-black mt-5 hover:bg-blue-800 disabled:opacity-80 flex items-center justify-center"
        >
          {mutation.isPending ? "Creating…" : "Create Department"}
        </button>
      </div>
    </div>
  );
};
