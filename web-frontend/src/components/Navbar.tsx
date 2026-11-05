import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";
import { ScanLine, User, X, Phone, Edit2, LogOut } from "lucide-react";

const ROLE_COLORS: Record<UserRole, string> = {
  USER: "#8a8f98",
  AUTHORITY: "#02b8cc",
  ADMIN: "#6366f1",
};
const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Citizen Reporter",
  AUTHORITY: "Authority Field Lead",
  ADMIN: "City Admin Director",
};

export const Navbar: React.FC = () => {
  const { user, role, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleLogout = async () => {
    setShowProfile(false);
    await logout();
    navigate("/login");
  };

  const startEdit = () => {
    setEditName(user?.name || user?.full_name || "");
    setEditPhone(user?.phone || "");
    setSaveError(null);
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!editName.trim()) { setSaveError("Name cannot be empty."); return; }
    setSaving(true);
    try {
      await updateProfile(editName, editPhone);
      setEditing(false);
    } catch (e) {
      setSaveError((e as Error).message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <nav className="bg-void/90 backdrop-blur px-4 py-2.5 flex items-center justify-between border-b border-graphite sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <ScanLine size={20} className="text-paper" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-paper font-medium text-base tracking-[-0.01em]">RoadLens</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-mist px-2 py-0.5 rounded-full bg-white/[0.05] uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[role] }} />
                {role}
              </span>
            </div>
            <p className="text-fog text-xs font-normal">{user?.name || user?.full_name || user?.email || "Guest"}</p>
          </div>
        </div>
        <button
          onClick={() => setShowProfile(true)}
          className="w-9 h-9 rounded-full bg-obsidian border border-graphite flex items-center justify-center hover:border-smoke transition-colors"
        >
          <User size={18} className="text-mist" />
        </button>
      </nav>

      {showProfile && (
        <div className="fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4" onClick={() => { setShowProfile(false); setEditing(false); }}>
          <div className="bg-carbon rounded-xl border border-graphite shadow-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-paper">My Account</h2>
                <p className="text-xs text-fog">{editing ? "Update your contact details" : "Signed in session"}</p>
              </div>
              <button onClick={() => { setShowProfile(false); setEditing(false); }} className="p-1 text-ash hover:text-mist">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 border border-graphite rounded-xl p-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: ROLE_COLORS[role] }}>
                <User size={22} className="text-void" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-paper truncate">{user?.name || user?.full_name || "User"}</p>
                <p className="text-xs text-fog truncate">{user?.email}</p>
                <span className="text-[10px] font-medium text-mist px-2 py-0.5 rounded-full bg-white/[0.05] mt-1 inline-block uppercase tracking-wide">
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </div>

            {editing ? (
              <div>
                <label className="text-xs font-medium text-mist block mb-1">Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist mb-3 placeholder:text-fog focus:outline-none focus:border-mist" />
                <label className="text-xs font-medium text-mist block mb-1">Phone</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-mist mb-3 placeholder:text-fog focus:outline-none focus:border-mist" />
                {saveError && <p className="text-xs text-coral-red font-medium mb-2">{saveError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="flex-1 border border-graphite rounded-md py-2.5 text-sm font-normal text-mist hover:border-smoke">Cancel</button>
                  <button onClick={saveProfile} disabled={saving} className="flex-1 bg-acid-lime text-void rounded-md py-2.5 text-sm font-medium hover:brightness-90 disabled:opacity-70">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2.5 mb-3">
                  <Phone size={15} className="text-ash" />
                  <span className="text-sm text-mist">{user?.phone || "No phone number added"}</span>
                </div>
                <button onClick={startEdit} className="w-full flex items-center justify-center gap-2 bg-acid-lime text-void rounded-md py-2.5 text-sm font-medium hover:brightness-90 mb-2">
                  <Edit2 size={15} /> Edit Profile
                </button>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 border border-graphite text-mist rounded-md py-2.5 text-sm font-normal hover:border-smoke">
                  <LogOut size={15} /> Log Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
