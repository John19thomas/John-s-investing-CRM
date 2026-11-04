import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useKiteSync } from "@/data/hooks";

// Zerodha redirects here after login with ?request_token=…&status=success.
// Set this page's URL as the Redirect URL in the Kite Connect developer console.
export default function KiteCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sync = useKiteSync();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get("request_token");
    if (params.get("status") !== "success" || !token) {
      setError("Zerodha didn't complete the login. Please try again.");
      return;
    }
    sync.mutate(token, {
      onSuccess: (r) => {
        if (r.status === "ok")
          toast.success(`Kite connected · ${r.equityCount} stocks, ${r.mfCount} funds synced`);
        navigate("/app/india", { replace: true });
      },
      onError: (e) => setError(e.message),
    });
  }, [params, sync, navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <h1 className="font-display text-4xl">Kite login didn't finish</h1>
          <p className="max-w-md text-ink-2">{error}</p>
          <Link
            to="/app/india"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
          >
            Back to India equities
          </Link>
        </>
      ) : (
        <>
          <div className="size-6 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
          <p className="text-ink-2">Connecting to Zerodha and syncing your holdings…</p>
        </>
      )}
    </div>
  );
}
