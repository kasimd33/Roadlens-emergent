import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, KeyRound, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email.");
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setInfo("If an account exists for that email, we sent a 6-digit reset code. Check your inbox.");
      setStep("reset");
    } catch (err) {
      setError((err as Error).message || "Could not send reset code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (code.trim().length < 4) return setError("Enter the reset code from your email.");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    if (newPassword !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await resetPassword(email, code, newPassword);
      setInfo("Password reset! Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setError((err as Error).message || "Invalid or expired reset code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh bg-[#1E3A8A] py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-white text-lg font-black">Reset Password</h1>
          <Link to="/login" className="text-blue-200 text-sm hover:underline">
            Back
          </Link>
        </div>

        <form
          onSubmit={step === "request" ? handleRequest : handleReset}
          className="bg-[#F8F9FA] rounded-2xl p-6 shadow-xl"
        >
          <p className="text-[13px] leading-snug text-gray-500 mb-4">
            {step === "request"
              ? "Enter your account email and we'll send you a verification code."
              : "Enter the code we emailed you and choose a new password."}
          </p>

          <label className="block text-xs font-black text-gray-700 mb-1.5">Email</label>
          <div className="flex items-center border border-gray-300 rounded-lg bg-white h-12 px-3">
            <Mail size={18} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={step === "reset"}
              className="flex-1 text-sm outline-none bg-transparent text-gray-900 disabled:bg-gray-100 disabled:rounded"
            />
          </div>

          {step === "reset" && (
            <>
              <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">Reset Code</label>
              <div className="flex items-center border border-gray-300 rounded-lg bg-white h-12 px-3">
                <KeyRound size={18} className="text-gray-400 mr-2 shrink-0" />
                <input
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent text-gray-900 tracking-[0.3em]"
                />
              </div>

              <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">New Password</label>
              <div className="flex items-center border border-gray-300 rounded-lg bg-white h-12 px-3">
                <Lock size={18} className="text-gray-400 mr-2 shrink-0" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent text-gray-900"
                />
              </div>

              <label className="block text-xs font-black text-gray-700 mb-1.5 mt-4">Confirm New Password</label>
              <div className="flex items-center border border-gray-300 rounded-lg bg-white h-12 px-3">
                <Lock size={18} className="text-gray-400 mr-2 shrink-0" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent text-gray-900"
                />
              </div>
            </>
          )}

          {info && <p className="text-xs font-semibold text-green-600 mt-3">{info}</p>}
          {error && <p className="text-xs font-semibold text-red-600 mt-3" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-lg bg-blue-700 text-white text-[15px] font-black mt-5 hover:bg-blue-800 disabled:opacity-80 flex items-center justify-center"
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : step === "request" ? (
              "Send Reset Code"
            ) : (
              "Reset Password"
            )}
          </button>

          <p className="text-center mt-4">
            <Link to="/login" className="text-[13px] font-bold text-blue-700 hover:underline">
              Back to Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
