import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, saveAuthToken, clearAuthToken, getAuthToken } from "@/src/api/client";
import { PublicUser, UserRole } from "@/src/types";

// Required for the OAuth redirect to complete on mobile
WebBrowser.maybeCompleteAuthSession();

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com/";

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
  signup: async () => {},
  signInWithGoogle: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  demoLogin: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

function extractSessionId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const processedSessions = useRef<Set<string>>(new Set());

  const applySession = useCallback(async (accessToken: string, userObj: PublicUser) => {
    await saveAuthToken(accessToken);
    setToken(accessToken);
    setUser(userObj);
  }, []);

  const exchangeGoogleSession = useCallback(
    async (sessionId: string) => {
      if (processedSessions.current.has(sessionId)) return;
      processedSessions.current.add(sessionId);
      const res = await api.googleSession(sessionId);
      await applySession(res.access_token, res.user);
    },
    [applySession]
  );

  const init = useCallback(async () => {
    try {
      // Web: handle Google OAuth redirect (session_id in hash/query) FIRST
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const sid = extractSessionId(window.location.hash) || extractSessionId(window.location.search);
        if (sid) {
          try {
            await exchangeGoogleSession(sid);
            // Clean the session_id from the URL after success
            window.history.replaceState(
              window.history.state,
              "",
              window.location.origin + window.location.pathname
            );
            return;
          } catch (e) {
            console.warn("Google web session exchange failed:", e);
          }
        }
      }

      const storedToken = await getAuthToken();
      if (storedToken) {
        setToken(storedToken);
        try {
          const me = await api.getMe();
          setUser(me);
        } catch {
          await clearAuthToken();
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [exchangeGoogleSession]);

  useEffect(() => {
    init();
  }, [init]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      /* ignore */
    }
  }, []);

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

  const signInWithGoogle = async () => {
    const redirectUrl =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin + "/"
        : Linking.createURL("");
    const authUrl = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.location.href = authUrl;
      return;
    }

    // Mobile: capture the deep link from multiple sources
    let capturedUrl: string | null = null;
    const sub = Linking.addEventListener("url", (event) => {
      if (event?.url) capturedUrl = event.url;
    });
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      let sid: string | null = null;
      if (result.type === "success" && (result as any).url) {
        sid = extractSessionId((result as any).url);
      }
      if (!sid && capturedUrl) sid = extractSessionId(capturedUrl);
      if (!sid) sid = extractSessionId(await Linking.getInitialURL());
      if (sid) {
        await exchangeGoogleSession(sid);
      } else {
        throw new Error("Google sign-in was cancelled or returned no session.");
      }
    } finally {
      sub.remove();
    }
  };

  const demoLogin = async (targetRole: UserRole) => {
    const res = await api.demoLogin(targetRole);
    await applySession(res.access_token, res.user);
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
        signup,
        signInWithGoogle,
        forgotPassword,
        resetPassword,
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
