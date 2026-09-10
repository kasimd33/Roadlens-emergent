import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, saveAuthToken, clearAuthToken, getAuthToken } from "@/src/api/client";
import { PublicUser, UserRole } from "@/src/types";

interface AuthContextType {
  user: PublicUser | null;
  token: string | null;
  role: UserRole;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, fullName?: string, phone?: string) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  role: "USER",
  isLoading: true,
  login: async () => {},
  register: async () => {},
  demoLogin: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const storedToken = await getAuthToken();
      if (storedToken) {
        setToken(storedToken);
        const me = await api.getMe();
        setUser(me);
      } else {
        // Auto-login to Citizen demo on first launch for zero-friction testing
        const res = await api.demoLogin("USER");
        await saveAuthToken(res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      }
    } catch (e) {
      console.warn("Auth initialization note:", e);
      // Fallback to Citizen demo account
      try {
        const res = await api.demoLogin("USER");
        await saveAuthToken(res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      } catch (err) {
        console.error("Demo login error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ username, password });
      await saveAuthToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string, fullName?: string, phone?: string) => {
    setIsLoading(true);
    try {
      const res = await api.register({ username, password, full_name: fullName, phone });
      await saveAuthToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin(targetRole);
      await saveAuthToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await clearAuthToken();
    setToken(null);
    setUser(null);
  };

  const role: UserRole = user?.role || "USER";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
