import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, Eye, EyeOff, ScanLine } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

export const LoginPage: React.FC = () => {
  const { login, signInWithGoogle, demoLogin } = useAuth();
  const navigate = useNavigate();
  // Quick demo access: shown by default; hide per-deployment with VITE_SHOW_DEMO_ACCESS=false
  const showDemoAccess = import.meta.env.VITE_SHOW_DEMO_ACCESS !== "false";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError((err as Error).message || "Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  const handleDemo = async (role: UserRole) => {
    setError(null);
    setSubmitting(true);
    try {
      await demoLogin(role);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Demo login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh bg-[#1E3A8A] py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Brand header */}
        <div className="text-center mb-8">
          <ScanLine size={56} className="text-white mx-auto" />
          <h1 className="text-white text-2xl font-black mt-2">Welcome to RoadLens</h1>
          <p className="text-blue-200 text-sm mt-1">Sign in to report and track road damage</p>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} className="bg-[#F8F9FA] rounded-2xl p-6 shadow-xl">
          <label className="block text-xs font-black text-gray-700 mb-1.5">Email</label>
          <div className="flex items-center border border-gray-300 rounded-lg bg-white h-12 px-3 mb-4">
            <Mail size={18} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-900"
            />
          </div>

          <label className="block text-xs font-black text-gray-700 mb-1.5">Password</label>
          <div className="flex items-center border border-gray-300 rounded-lg bg-white h-12 px-3">
            <Lock size={18} className="text-gray-400 mr-2 shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="text-right mt-3">
            <Link to="/forgot-password" className="text-xs font-bold text-blue-700 hover:underline">
              Forgot Password?
            </Link>
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 mt-2" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-lg bg-blue-700 text-white text-[15px] font-black mt-3 hover:bg-blue-800 disabled:opacity-80 flex items-center justify-center"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : "Login"}
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="mx-3 text-xs font-semibold text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full h-12 rounded-lg border-[1.5px] border-gray-300 bg-white flex items-center justify-center gap-2 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-80"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.4 1.79 14.94.75 12 .75 7.62.75 3.84 3.27 2.04 6.88l3.66 2.84C6.54 7.09 9.03 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.25 12.26c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.85c2.15-1.99 3.5-4.92 3.5-8.67z" />
                  <path fill="#FBBC05" d="M5.7 14.29a7.06 7.06 0 0 1 0-4.57L2.04 6.88a11.26 11.26 0 0 0 0 10.25l3.66-2.84z" />
                  <path fill="#34A853" d="M12 23.25c3.04 0 5.6-1 7.46-2.72l-3.68-2.85c-1.02.69-2.33 1.1-3.78 1.1-2.97 0-5.46-2.05-6.3-4.68l-3.66 2.84c1.8 3.61 5.58 6.31 9.96 6.31z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p className="text-center text-[13px] text-gray-500 mt-5">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-blue-700 font-extrabold hover:underline">
              Sign Up
            </Link>
          </p>
        </form>

        {/* Demo quick access (hidden when VITE_SHOW_DEMO_ACCESS=false) */}
        {showDemoAccess && (
        <div className="mt-8 text-center">
          <p className="text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-3">
            Quick demo access
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleDemo("USER")}
              disabled={submitting}
              className="border-[1.5px] border-blue-400 text-blue-100 text-xs font-bold rounded-full px-4 py-2 hover:bg-blue-400/20 disabled:opacity-60"
            >
              Citizen
            </button>
            <button
              onClick={() => handleDemo("AUTHORITY")}
              disabled={submitting}
              className="border-[1.5px] border-amber-500 text-blue-100 text-xs font-bold rounded-full px-4 py-2 hover:bg-amber-500/20 disabled:opacity-60"
            >
              Authority
            </button>
            <button
              onClick={() => handleDemo("ADMIN")}
              disabled={submitting}
              className="border-[1.5px] border-blue-200 text-blue-100 text-xs font-bold rounded-full px-4 py-2 hover:bg-blue-200/20 disabled:opacity-60"
            >
              Admin
            </button>
          </div>
          <div className="mt-3 text-blue-300/80 text-[10px] leading-relaxed">
            <p>citizen@roadlens.gov / Citizen@123</p>
            <p>authority@roadlens.gov / Authority@123</p>
            <p>admin@roadlens.gov / Admin@123</p>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
