import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query-client";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SplashScreen } from "./components/SplashScreen";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InspectPage } from "./pages/InspectPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { NotificationsPage } from "./pages/NotificationsPage";

/** Entry route: splash while session restores, then route by auth state. */
const EntryRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SplashScreen />;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};

/** Public auth pages bounce to the dashboard when already signed in. */
const PublicOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SplashScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

/** Authenticated shell; unauthenticated visitors go to login. */
const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

/** Workspace is only for AUTHORITY / ADMIN (hidden for citizens). */
const StaffOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  if (role === "USER") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<EntryRoute />} />
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/inspect" element={<Protected><InspectPage /></Protected>} />
            <Route path="/complaints" element={<Protected><ComplaintsPage /></Protected>} />
            <Route path="/workspace" element={<Protected><StaffOnly><WorkspacePage /></StaffOnly></Protected>} />
            <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
