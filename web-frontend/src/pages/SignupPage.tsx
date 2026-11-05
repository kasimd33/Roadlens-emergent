import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, Eye, EyeOff, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const SignupPage: React.FC = () => {
  const { signup, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await signup(email, password, name);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Sign up failed. Please try again.");
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

  const inputRow = (
    key: React.ReactNode,
    input: React.ReactNode,
  ) => (
    <div className="flex items-center border border-white/[0.08] rounded-md bg-white/[0.02] h-12 px-3 focus-within:border-mist">
      {key}
      {input}
    </div>
  );

  return (
    <div className="min-h-svh bg-void py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-paper text-lg font-medium tracking-[-0.012em]">Create Account</h1>
          <Link to="/login" className="text-fog text-sm hover:text-mist">
            Back
          </Link>
        </div>

        <form onSubmit={handleSignup} className="bg-carbon rounded-xl p-8 border border-graphite shadow-subtle">
          <label className="block text-xs font-normal text-mist mb-1.5">Name</label>
          {inputRow(
            <UserIcon size={18} className="text-ash mr-2 shrink-0" />,
            <input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-mist placeholder:text-fog"
            />,
          )}

          <label className="block text-xs font-normal text-mist mb-1.5 mt-4">Email</label>
          {inputRow(
            <Mail size={18} className="text-ash mr-2 shrink-0" />,
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-mist placeholder:text-fog"
            />,
          )}

          <label className="block text-xs font-normal text-mist mb-1.5 mt-4">Password</label>
          {inputRow(
            <>
              <Lock size={18} className="text-ash mr-2 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent text-mist placeholder:text-fog min-w-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="p-1 text-ash hover:text-mist"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </>,
            null,
          )}

          <label className="block text-xs font-normal text-mist mb-1.5 mt-4">Confirm Password</label>
          {inputRow(
            <Lock size={18} className="text-ash mr-2 shrink-0" />,
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-mist placeholder:text-fog"
            />,
          )}

          {error && (
            <p className="text-xs font-medium text-coral-red mt-3" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-md bg-acid-lime text-void text-[15px] font-medium tracking-[-0.011em] mt-5 hover:brightness-90 disabled:opacity-80 flex items-center justify-center"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : "Create Account"}
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-graphite" />
            <span className="mx-3 text-xs font-normal text-ash">or</span>
            <div className="flex-1 h-px bg-graphite" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full h-12 rounded-md border border-graphite bg-transparent flex items-center justify-center gap-2 text-sm font-normal text-mist hover:border-smoke disabled:opacity-80"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Continue with Google"
            )}
          </button>

          <p className="text-center text-[13px] text-fog mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-mist underline hover:text-paper">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
