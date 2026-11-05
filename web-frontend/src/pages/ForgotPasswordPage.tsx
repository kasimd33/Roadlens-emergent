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
    <div className="min-h-svh bg-void py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-paper text-lg font-medium tracking-[-0.012em]">Reset Password</h1>
          <Link to="/login" className="text-fog text-sm hover:text-mist">
            Back
          </Link>
        </div>

        <form
          onSubmit={step === "request" ? handleRequest : handleReset}
          className="bg-carbon rounded-xl p-8 border border-graphite shadow-subtle"
        >
          <p className="text-[13px] leading-snug text-fog mb-4">
            {step === "request"
              ? "Enter your account email and we'll send you a verification code."
              : "Enter the code we emailed you and choose a new password."}
          </p>

          <label className="block text-xs font-normal text-mist mb-1.5">Email</label>
          <div className="flex items-center border border-white/[0.08] rounded-md bg-white/[0.02] h-12 px-3 focus-within:border-mist">
            <Mail size={18} className="text-ash mr-2 shrink-0" />
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={step === "reset"}
              className="flex-1 text-sm outline-none bg-transparent text-mist placeholder:text-fog disabled:bg-obsidian disabled:rounded-md"
            />
          </div>

          {step === "reset" && (
            <>
              <label className="block text-xs font-normal text-mist mb-1.5 mt-4">Reset Code</label>
              <div className="flex items-center border border-white/[0.08] rounded-md bg-white/[0.02] h-12 px-3 focus-within:border-mist">
                <KeyRound size={18} className="text-ash mr-2 shrink-0" />
                <input
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent text-mist placeholder:text-fog tracking-[0.3em]"
                />
              </div>

              <label className="block text-xs font-normal text-mist mb-1.5 mt-4">New Password</label>
              <div className="flex items-center border border-white/[0.08] rounded-md bg-white/[0.02] h-12 px-3 focus-within:border-mist">
                <Lock size={18} className="text-ash mr-2 shrink-0" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent text-mist placeholder:text-fog"
                />
              </div>

              <label className="block text-xs font-normal text-mist mb-1.5 mt-4">Confirm New Password</label>
              <div className="flex items-center border border-white/[0.08] rounded-md bg-white/[0.02] h-12 px-3 focus-within:border-mist">
                <Lock size={18} className="text-ash mr-2 shrink-0" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent text-mist placeholder:text-fog"
                />
              </div>
            </>
          )}

          {info && <p className="text-xs font-medium text-pulse-green mt-3">{info}</p>}
          {error && <p className="text-xs font-medium text-coral-red mt-3" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-md bg-acid-lime text-void text-[15px] font-medium tracking-[-0.011em] mt-5 hover:brightness-90 disabled:opacity-80 flex items-center justify-center"
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
            <Link to="/login" className="text-[13px] font-normal text-mist underline hover:text-paper">
              Back to Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
