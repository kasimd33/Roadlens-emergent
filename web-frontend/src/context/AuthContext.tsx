import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, saveAuthToken, clearAuthToken, getAuthToken } from "../api/client";
import type { PublicUser, UserRole } from "../types";

interface AuthContextType {
  user: PublicUser | null;
  token: string | null;
  role: UserRole;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  updateProfile: (name: string, phone: string) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, role: "USER", isLoading: true,
  login: async () => {}, signup: async () => {}, signInWithGoogle: async () => {},
  forgotPassword: async () => {}, resetPassword: async () => {}, updateProfile: async () => {},
  demoLogin: async () => {}, logout: async () => {}, refreshUser: async () => {},
});

function extractSessionId(url: string): string | null {
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback(async (accessToken: string, userObj: PublicUser) => {
    saveAuthToken(accessToken);
    setToken(accessToken);
    setUser(userObj);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // Handle Google OAuth redirect
        const sid = extractSessionId(window.location.hash) || extractSessionId(window.location.search);
        if (sid) {
          try {
            const res = await api.googleSession(sid);
            await applySession(res.access_token, res.user);
            window.history.replaceState({}, "", window.location.origin + window.location.pathname);
            return;
          } catch (e) {
            console.warn("Google session exchange failed:", e);
          }
        }
        const storedToken = getAuthToken();
        if (storedToken) {
          setToken(storedToken);
          try {
            const me = await api.getMe();
            setUser(me);
          } catch {
            clearAuthToken();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [applySession]);

  const refreshUser = async () => {
    try { const me = await api.getMe(); setUser(me); } catch {}
  };

  const login = async (email: string, password: string) => {
    const res = await api.login({ email: email.trim().toLowerCase(), password });
    await applySession(res.access_token, res.user);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const res = await api.register({ email: email.trim().toLowerCase(), password, name });
    await applySession(res.access_token, res.user);
  };

  const forgotPassword = async (email: string) => {
    await api.forgotPassword(email.trim().toLowerCase());
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    await api.resetPassword({ email: email.trim().toLowerCase(), code: code.trim(), new_password: newPassword });
  };

  const updateProfile = async (name: string, phone: string) => {
    const updated = await api.updateProfile({ name: name.trim(), phone: phone.trim() });
    setUser(updated);
  };

  const signInWithGoogle = async () => {
    const redirectUrl = window.location.origin + "/";
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
  };

  const demoLogin = async (targetRole: UserRole) => {
    const res = await api.demoLogin(targetRole);
    await applySession(res.access_token, res.user);
  };

  const logout = async () => {
    clearAuthToken();
    setToken(null);
    setUser(null);
  };

  const role: UserRole = user?.role || "USER";

  return (
    <AuthContext.Provider value={{ user, token, role, isLoading, login, signup, signInWithGoogle, forgotPassword, resetPassword, updateProfile, demoLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
