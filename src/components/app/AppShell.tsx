import { Building2, Globe2, IndianRupee } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useRepo } from "@/data/RepoContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";

const TABS = [
  { to: "india", label: "India equities", short: "India", icon: IndianRupee },
  { to: "revolut", label: "Global equities", short: "Global", icon: Globe2 },
  { to: "private", label: "Private company tracker", short: "Private", icon: Building2 },
] as const;

export default function AppShell() {
  const { repo, base } = useRepo();
  const navigate = useNavigate();
  const demo = repo.mode === "demo";

  return (
    <div className="min-h-dvh bg-paper pb-[calc(68px+env(safe-area-inset-bottom))] md:pb-0">
      {demo && (
        <div className="border-b border-line bg-paper-2">
          <div className="mx-auto max-w-[1200px] px-5 py-2 text-[13px] text-ink-2 sm:px-8">
            Demo with sample data. Private companies are fictional.{" "}
            <Link to="/" className="underline underline-offset-2 hover:text-ink">
              Back to overview
            </Link>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-10 px-5 sm:px-8">
          <Wordmark to="/" />
          <nav className="hidden h-full items-stretch gap-8 md:flex" aria-label="Sections">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    "-mb-px flex items-center border-b-2 text-[15px] transition-colors",
                    isActive
                      ? "border-ink font-medium text-ink"
                      : "border-transparent text-ink-3 hover:text-ink",
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto text-[15px]">
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

      <main className="mx-auto max-w-[1200px] px-5 pt-8 sm:px-8 sm:pt-14">
        <Outlet />
      </main>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
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
                  isActive ? "border-ink font-medium text-ink" : "border-transparent text-ink-3",
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
