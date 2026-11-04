import { Building2, Globe2, IndianRupee, LogOut, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useRepo } from "@/data/RepoContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";

const TABS = [
  { to: "india", label: "India equities", short: "India", icon: IndianRupee, n: "01" },
  { to: "revolut", label: "Global · Revolut", short: "Global", icon: Globe2, n: "02" },
  { to: "private", label: "Private & pipeline", short: "Private", icon: Building2, n: "03" },
] as const;

export default function AppShell() {
  const { repo, base } = useRepo();
  const navigate = useNavigate();
  const demo = repo.mode === "demo";

  return (
    <div className="min-h-dvh bg-paper pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">
      {demo && (
        <div className="bg-ink text-paper">
          <div className="mx-auto flex max-w-[1280px] items-center justify-center gap-2 px-4 py-2 text-center text-[13px]">
            <Sparkles className="size-3.5 shrink-0" aria-hidden />
            <span>
              Demo mode. Illustrative data; private companies are fictional.{" "}
              <Link to="/" className="underline underline-offset-2 hover:no-underline">
                Back to overview
              </Link>
            </span>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-4 sm:px-6">
          <Wordmark to="/" />
          <nav className="hidden flex-1 items-center justify-center md:flex" aria-label="Sections">
            <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
              {TABS.map((t) => (
                <NavLink key={t.to} to={t.to} className="relative">
                  {({ isActive }) => (
                    <span
                      className={cn(
                        "relative z-10 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                        isActive ? "text-paper" : "text-ink-2 hover:text-ink",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="tab-pill"
                          className="absolute inset-0 -z-10 rounded-full bg-ink"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <span
                        className={cn(
                          "tabular text-[11px]",
                          isActive ? "text-paper/60" : "text-ink-3",
                        )}
                      >
                        {t.n}
                      </span>
                      {t.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {demo ? (
              <Link
                to="/login"
                className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85"
              >
                Sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/");
                }}
                className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 sm:pt-10">
        <Outlet />
      </main>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Sections"
      >
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={`${base}/${t.to}`}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  isActive ? "text-ink" : "text-ink-3",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "grid h-8 w-14 place-items-center rounded-full transition-colors",
                      isActive && "bg-ink text-paper",
                    )}
                  >
                    <t.icon className="size-[18px]" aria-hidden />
                  </span>
                  {t.short}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
