import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { PillButton } from "@/components/app/primitives";
import { Wordmark } from "@/components/app/Wordmark";
import { supabase } from "@/lib/supabase";

const field =
  "w-full rounded-sm border border-line bg-surface px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-ink";

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app/india";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(from, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app/india` },
        });
        if (error) throw error;
        if (data.session) navigate(from, { replace: true });
        else toast.success("Check your inbox to confirm your email, then sign in.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center px-5 sm:px-8">
          <Wordmark />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
        <h1 className="font-display text-[36px] leading-tight">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-3 text-[15px] text-ink-2">
          This dashboard is private.{" "}
          <Link to="/demo/india" className="underline underline-offset-2 hover:text-ink">
            View the demo
          </Link>{" "}
          to see how it works.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-3">
          <input
            className={field}
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={field}
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="Password (8+ characters)"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PillButton type="submit" className="w-full py-3" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </PillButton>
        </form>
        <button
          type="button"
          className="mt-5 text-left text-sm text-ink-3 hover:text-ink"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </main>
    </div>
  );
}
