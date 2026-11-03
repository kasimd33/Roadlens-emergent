import React, { useState } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Authority } from "../types";

interface Props {
  visible: boolean;
  onClose: () => void;
  authorities: Authority[];
}

export const CreateAuthorityUserModal: React.FC<Props> = ({ visible, onClose, authorities }) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authorityId, setAuthorityId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.createAuthorityUser({ email, password, name, authority_id: authorityId }),
    onSuccess: (u: { email: string }) => {
      setSuccess(`Authority account created for ${u.email}`);
      setName("");
      setEmail("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (e: Error) => setError(e?.message || "Could not create authority account."),
  });

  if (!visible) return null;

  const effectiveAuthority = authorityId || authorities[0]?.id || "";

  const handleSubmit = () => {
    setError(null);
    setSuccess(null);
    if (!name.trim()) return setError("Enter the engineer's name.");
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!effectiveAuthority) return setError("Select a department.");
    setAuthorityId(effectiveAuthority);
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92svh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-black text-gray-800">Create Authority Account</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Authority logins can only be created here by an Admin. They cannot self-register.
        </p>

        <label className="block text-xs font-black text-gray-700 mb-1.5">Engineer Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jordan Blake"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">Login Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="engineer@roadlens.gov"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">Temporary Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">Assign to Department</label>
        <div className="space-y-2">
          {authorities.map((a) => {
            const selected = effectiveAuthority === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAuthorityId(a.id)}
                className={`w-full flex items-center gap-2 border-[1.5px] rounded-lg p-3 text-left ${
                  selected ? "border-blue-700 bg-blue-100" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <span
                  className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? "border-blue-700" : "border-gray-300"
                  }`}
                >
                  {selected && <span className="w-2.5 h-2.5 rounded-full bg-blue-700" />}
                </span>
                <span className="text-[13px] font-bold text-gray-800 flex-1">{a.name}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-xs font-semibold text-red-600 mt-3" role="alert">{error}</p>}
        {success && <p className="text-xs font-semibold text-green-600 mt-3">{success}</p>}

        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="w-full h-12 rounded-lg bg-blue-700 text-white text-[15px] font-black mt-5 hover:bg-blue-800 disabled:opacity-80 flex items-center justify-center"
        >
          {mutation.isPending ? "Creating…" : "Create Authority Login"}
        </button>
      </div>
    </div>
  );
};
