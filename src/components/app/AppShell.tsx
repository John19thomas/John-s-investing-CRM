import { Building2, Globe2, IndianRupee } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useRepo } from "@/data/RepoContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ChatDock } from "./ChatDock";
import { Wordmark } from "./Wordmark";

const TABS = [
  { to: "india", label: "India equities", short: "India", icon: IndianRupee },
  { to: "revolut", label: "Global equities", short: "Global", icon: Globe2 },
  { to: "private", label: "Private companies", short: "Private", icon: Building2 },
] as const;

export default function AppShell() {
  const { repo, base } = useRepo();
  const navigate = useNavigate();
  const demo = repo.mode === "demo";

  return (
    <div className="min-h-dvh bg-paper pb-[calc(68px+env(safe-area-inset-bottom))] md:pb-0">
      {demo && (
        <div className="border-b border-line bg-paper-2">
          <div className="mx-auto max-w-[1320px] px-5 py-2 text-[13px] text-ink-2 sm:px-10">
            Demo with sample data. Private companies are fictional.{" "}
            <Link to="/" className="underline underline-offset-2 hover:text-ink">
              Back to overview
            </Link>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1320px] items-center gap-10 px-5 sm:px-10">
          <Wordmark to="/" />
          <nav className="ml-auto hidden items-center gap-9 md:flex" aria-label="Sections">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    "label-caps transition-colors",
                    isActive ? "text-ink" : "text-ink-3 hover:text-ink",
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="label-caps ml-auto md:ml-0">
            {demo ? (
              <Link to="/login" className="text-ink-2 hover:text-ink">
                Sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/");
                }}
                className="text-ink-2 hover:text-ink"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-5 pt-8 sm:px-10 sm:pt-16">
        <Outlet />
      </main>

      <ChatDock />

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-paper/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Sections"
      >
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={`${base}/${t.to}`}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 border-t-2 py-2.5 text-[12px]",
                  isActive ? "border-brand font-medium text-ink" : "border-transparent text-ink-3",
                )
              }
            >
              <t.icon className="size-[18px]" aria-hidden />
              {t.short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
