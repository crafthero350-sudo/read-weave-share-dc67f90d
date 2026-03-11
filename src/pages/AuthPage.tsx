import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() || undefined },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) toast.error("Google sign-in failed");
    } catch {
      toast.error("Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7, #4c63d2)",
      }}
    >
      {/* White card container */}
      <div className="w-full max-w-[350px] bg-white rounded-sm border border-gray-200 px-10 py-10 flex flex-col items-center">
        {/* Instagram-style logo text */}
        <h1
          className="text-4xl mb-8"
          style={{ fontFamily: "'Grand Hotel', cursive, serif" }}
        >
          BookApp
        </h1>

        <form onSubmit={handleEmailAuth} className="w-full space-y-2">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#fafafa] border border-gray-300 rounded-sm px-3 py-2.5 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-gray-400"
            />
          )}
          <input
            type="text"
            placeholder="Phone number, username or email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#fafafa] border border-gray-300 rounded-sm px-3 py-2.5 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-gray-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-[#fafafa] border border-gray-300 rounded-sm px-3 py-2.5 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-gray-400"
          />

          {!isSignUp && (
            <div className="text-right pt-1">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs text-[#00376b] font-normal"
              >
                Forgotten password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40 transition-opacity mt-2"
          >
            {isSignUp ? "Sign up" : "Log in"}
          </button>
        </form>

        {/* OR divider */}
        <div className="flex items-center gap-4 w-full my-5">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-xs text-gray-500 font-semibold">OR</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        {/* Google sign in (replacing Facebook) */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-[#385185] disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Log in with Google
        </button>

        {!isSignUp && (
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-xs text-[#00376b] mt-5"
          >
            Forgotten your password?
          </button>
        )}
      </div>

      {/* Sign up / Sign in toggle card */}
      <div className="w-full max-w-[350px] bg-white rounded-sm border border-gray-200 px-10 py-5 mt-3 text-center">
        <p className="text-sm text-gray-800">
          {isSignUp ? "Have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[#0095f6] font-semibold"
          >
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
