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
    <div className="fixed inset-0 bg-void/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-carbon w-full sm:max-w-md rounded-t-xl sm:rounded-xl border border-graphite shadow-xl p-5 max-h-[92svh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-medium text-paper">Create Authority Account</h3>
          <button onClick={onClose} className="p-1 text-ash hover:text-mist">
            <X size={22} />
          </button>
        </div>
        <p className="text-xs text-fog mt-1 mb-4">
          Authority logins can only be created here by an Admin. They cannot self-register.
        </p>

        <label className="block text-xs font-medium text-mist mb-1.5">Engineer Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jordan Blake"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist placeholder:text-fog focus:outline-none focus:border-mist"
        />

        <label className="block text-xs font-medium text-mist mb-1.5 mt-4">Login Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="engineer@roadlens.gov"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist placeholder:text-fog focus:outline-none focus:border-mist"
        />

        <label className="block text-xs font-medium text-mist mb-1.5 mt-4">Temporary Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist placeholder:text-fog focus:outline-none focus:border-mist"
        />

        <label className="block text-xs font-medium text-mist mb-1.5 mt-4">Assign to Department</label>
        <div className="space-y-2">
          {authorities.map((a) => {
            const selected = effectiveAuthority === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAuthorityId(a.id)}
                className={`w-full flex items-center gap-2 border rounded-lg p-3 text-left transition-colors ${
                  selected ? "border-acid-lime bg-obsidian" : "border-graphite hover:border-smoke"
                }`}
              >
                <span
                  className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? "border-acid-lime" : "border-smoke"
                  }`}
                >
                  {selected && <span className="w-2.5 h-2.5 rounded-full bg-acid-lime" />}
                </span>
                <span className="text-[13px] font-medium text-paper flex-1">{a.name}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-xs font-medium text-coral-red mt-3" role="alert">{error}</p>}
        {success && <p className="text-xs font-medium text-pulse-green mt-3">{success}</p>}

        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="w-full h-12 rounded-md bg-acid-lime text-void text-[15px] font-medium mt-5 hover:brightness-90 disabled:opacity-80 flex items-center justify-center"
        >
          {mutation.isPending ? "Creating…" : "Create Authority Login"}
        </button>
      </div>
    </div>
  );
};
