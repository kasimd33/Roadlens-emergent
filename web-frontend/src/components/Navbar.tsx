import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";
import { ScanLine, User, X, Phone, Edit2, LogOut } from "lucide-react";

const ROLE_COLORS: Record<UserRole, string> = {
  USER: "#3B82F6",
  AUTHORITY: "#D97706",
  ADMIN: "#1D4ED8",
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
      <nav className="bg-[#1E3A8A] px-4 py-2.5 flex items-center justify-between border-b border-blue-900 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <ScanLine size={24} className="text-white" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-base tracking-wide">RoadLens</span>
              <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded uppercase" style={{ backgroundColor: ROLE_COLORS[role] }}>
                {role}
              </span>
            </div>
            <p className="text-blue-300 text-xs font-medium">{user?.name || user?.full_name || user?.email || "Guest"}</p>
          </div>
        </div>
        <button
          onClick={() => setShowProfile(true)}
          className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-400 transition-colors"
        >
          <User size={18} className="text-white" />
        </button>
      </nav>

      {showProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowProfile(false); setEditing(false); }}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-gray-800">My Account</h2>
                <p className="text-xs text-gray-500">{editing ? "Update your contact details" : "Signed in session"}</p>
              </div>
              <button onClick={() => { setShowProfile(false); setEditing(false); }} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 border-2 border-gray-100 rounded-xl p-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: ROLE_COLORS[role] }}>
                <User size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-800 truncate">{user?.name || user?.full_name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded mt-1 inline-block" style={{ backgroundColor: ROLE_COLORS[role] }}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </div>

            {editing ? (
              <div>
                <label className="text-xs font-black text-gray-700 block mb-1">Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <label className="text-xs font-black text-gray-700 block mb-1">Phone</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {saveError && <p className="text-xs text-red-600 font-semibold mb-2">{saveError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={saveProfile} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-black hover:bg-blue-700 disabled:opacity-70">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5 mb-3">
                  <Phone size={15} className="text-gray-400" />
                  <span className="text-sm text-gray-700">{user?.phone || "No phone number added"}</span>
                </div>
                <button onClick={startEdit} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-black hover:bg-blue-700 mb-2">
                  <Edit2 size={15} /> Edit Profile
                </button>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 border border-red-500 text-red-600 rounded-lg py-2.5 text-sm font-bold hover:bg-red-50">
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
