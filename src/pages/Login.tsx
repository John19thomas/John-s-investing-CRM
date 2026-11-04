import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { PillButton } from "@/components/app/primitives";
import { Wordmark } from "@/components/app/Wordmark";
import { supabase } from "@/lib/supabase";

const field =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-ink";

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
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Wordmark />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-5xl leading-none">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-3 text-ink-2">This is a private dashboard. Want a look around first?</p>
          <Link to="/demo/india" className="mt-1 text-sm underline underline-offset-2">
            Open the demo instead
          </Link>
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
              placeholder="Password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <PillButton type="submit" className="w-full py-3" disabled={busy}>
              {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
            </PillButton>
          </form>
          <button
            type="button"
            className="mt-4 text-left text-sm text-ink-2"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          >
            {mode === "signin"
              ? "First time here? Create the owner account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink text-paper lg:block">
        <div className="paper-grid absolute inset-0 opacity-[0.15] invert" aria-hidden />
        <div className="relative flex h-full flex-col justify-end p-14">
          <p className="font-display text-[56px] leading-[1.02]">
            Every position,
            <br />
            <em className="text-paper/60">one quiet view.</em>
          </p>
          <p className="mt-6 max-w-md text-paper/60">
            India equities from Zerodha Kite, global equities from Revolut and a private-markets
            pipeline read by Claude.
          </p>
        </div>
      </div>
    </div>
  );
}
