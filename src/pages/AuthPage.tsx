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
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden bg-background"
    >
      {/* Soft ambient blobs */}
      <div aria-hidden className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-pastel-lavender blur-3xl opacity-60" />
      <div aria-hidden className="absolute -bottom-24 -right-20 w-80 h-80 rounded-full bg-pastel-mint blur-3xl opacity-60" />
      <div aria-hidden className="absolute top-1/3 -right-16 w-56 h-56 rounded-full bg-pastel-peach blur-3xl opacity-50" />

      {/* Main card — Apple Books cream */}
      <div className="relative w-full max-w-[380px] ios-card px-8 py-10 flex flex-col items-center animate-spring-in">
        <h1 className="ios-serif-title text-[40px] mb-1">
          BookApp<span className="sr-only"> — Log in or create an account</span>
        </h1>
        <p className="text-[14px] text-muted-foreground mb-8">
          {isSignUp ? "Create your reading account" : "Welcome back, reader"}
        </p>

        <form onSubmit={handleEmailAuth} className="w-full space-y-3">
          {isSignUp && (
            <input
              type="text"
              aria-label="Full name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:bg-secondary transition-colors"
            />
          )}
          <input
            type="text"
            aria-label="Email or username"
            placeholder="Email or username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:bg-secondary transition-colors"
          />
          <input
            type="password"
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:bg-secondary transition-colors"
          />

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ios-press w-full bg-primary text-primary-foreground rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-40 transition-opacity mt-2 shadow-sm"
          >
            {isSignUp ? "Create account" : "Log in"}
          </button>
        </form>

        {/* OR divider */}
        <div className="flex items-center gap-3 w-full my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground font-medium tracking-widest uppercase">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google sign in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="ios-press w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full border border-border bg-card text-[14px] font-semibold text-foreground disabled:opacity-50"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Toggle pill */}
      <div className="relative w-full max-w-[380px] mt-3 ios-card py-4 text-center">
        <p className="text-[14px] text-foreground">
          {isSignUp ? "Have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-foreground font-semibold underline-offset-2 hover:underline"
          >
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
