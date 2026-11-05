import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { BrandMark } from "@/components/app/Wordmark";
import { CompanyLogo } from "@/components/holdings/CompanyLogo";
import { moneyCompact, pct } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ---- data: /functions/v1/public-portfolio (percentages for everyone, amounts for the owner) ----

type Segment = {
  key: "india" | "global";
  label: string;
  currency: string;
  count: number;
  returnPct: number | null;
  dayChangePct: number | null;
  pricesAt: string | null;
  value?: number;
  cost?: number;
  dayChange?: number | null;
};
type PublicHolding = {
  symbol: string;
  name: string;
  website: string | null;
  oneLiner: string | null;
  sector: string | null;
  segment: "india" | "global";
  weightPct: number | null;
  segmentWeightPct: number | null;
  dayChangePct: number | null;
  returnPct: number | null;
  value?: number;
  currency?: string;
};
type Portfolio = {
  asOf: string;
  owner: boolean;
  allocation: { india: number; global: number } | null;
  totalInr?: number | null;
  segments: Segment[];
  holdings: PublicHolding[];
  updates: {
    symbol: string;
    name: string;
    website: string | null;
    period: string | null;
    headline: string | null;
    date: string | null;
  }[];
  private: { total: number; tracking: number; invested: number; passed: number };
  empty?: boolean;
};

function usePortfolio(signedIn: boolean) {
  return useQuery({
    queryKey: ["public-portfolio", signedIn],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Portfolio>("public-portfolio", {
        method: "GET",
      });
      if (error) throw error;
      return data!;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

// ---- page ----
// ---- page ----
// Palette: dark royal green with white type. Copy uses no commas or full stops; "·" separates.

const BG = "#03140d";
const GAIN = "text-[#5ef0b0]";
const LOSS = "text-[#ff8a8a]";
const tone = (x: number | null | undefined) => (x == null ? "text-white/40" : x >= 0 ? GAIN : LOSS);

export default function Landing() {
  const { session } = useAuth();
  const q = usePortfolio(!!session);
  const d = q.data && !q.data.empty ? q.data : null;
  const india = d?.segments.find((s) => s.key === "india");
  const global = d?.segments.find((s) => s.key === "global");
  const pricesAt = [india?.pricesAt, global?.pricesAt].filter(Boolean).sort().at(-1) ?? null;
  const enter = session ? "/app/india" : "/login";

  return (
    <div className="relative min-h-dvh overflow-x-hidden text-white" style={{ background: BG }}>
      <Backdrop />

      <header
        className="sticky top-0 z-30 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: "rgba(3,20,13,0.72)" }}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Home">
            <BrandMark />
            <span className="text-[15px] font-medium tracking-tight">
              JT's <span className="font-light text-white/55">investing dashboard</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-[14px] whitespace-nowrap">
            <a
              href="#portfolio"
              className="px-3 py-2 font-light text-white/60 hover:text-white max-md:hidden"
            >
              Portfolio
            </a>
            <a
              href="#private"
              className="px-3 py-2 font-light text-white/60 hover:text-white max-md:hidden"
            >
              Private
            </a>
            <Link
              to="/demo/india"
              className="px-3 py-2 font-light text-white/60 hover:text-white max-sm:hidden"
            >
              Demo
            </Link>
            <Link
              to={enter}
              className="ml-2 rounded-full border border-white/15 px-4 py-2 font-normal transition-colors hover:bg-white/[0.08]"
            >
              {session ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto flex max-w-[1200px] flex-col items-center px-5 pt-20 text-center sm:px-8 sm:pt-28">
          <LivePill at={pricesAt} loading={q.isLoading} />
          <h1 className="mt-8 text-[46px] leading-[1.02] font-light tracking-[-0.04em] sm:text-[88px]">
            JT's portfolio
            <br />
            <span className="text-white/85">and pipeline</span>
          </h1>
          <p className="mt-8 max-w-2xl text-[17px] leading-relaxed font-light text-white/60 sm:text-[20px]">
            A consolidated dashboard of listed holdings in India and the US and the private
            companies I track and invest in
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to={enter}
              className="rounded-full bg-white px-7 py-3.5 text-[15px] font-medium text-[#03140d] shadow-[0_0_40px_rgba(255,255,255,0.18)] transition-shadow hover:shadow-[0_0_56px_rgba(255,255,255,0.28)]"
            >
              {session ? "Open dashboard" : "Sign in"}
            </Link>
            <Link
              to="/demo/india"
              className="rounded-full border border-white/15 px-7 py-3.5 text-[15px] font-light text-white/90 transition-colors hover:bg-white/[0.06]"
            >
              View the demo
            </Link>
          </div>
        </section>

        {/* Live readout */}
        <section className="mx-auto mt-20 max-w-[1200px] px-5 sm:mt-28 sm:px-8">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <Glass className="p-6 sm:p-7">
              <Label>Allocation</Label>
              {d?.allocation ? (
                <>
                  <div className="mt-6 flex items-end justify-between gap-4">
                    <Figure>{pct(d.allocation.india, 0, false)}</Figure>
                    <Figure className="text-white/55">{pct(d.allocation.global, 0, false)}</Figure>
                  </div>
                  <div className="mt-5 flex h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-[#5ef0b0]"
                      style={{ width: `${d.allocation.india}%` }}
                    />
                    <div
                      className="h-full bg-white/50"
                      style={{ width: `${d.allocation.global}%` }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-[13px] font-light text-white/50">
                    <span>India</span>
                    <span>Global</span>
                  </div>
                  {d.owner && d.totalInr != null && (
                    <p className="mt-5 border-t border-white/10 pt-4 text-[13px] font-light text-white/50">
                      Total{" "}
                      <span className="tabular font-normal text-white">
                        {moneyCompact(d.totalInr, "INR")}
                      </span>{" "}
                      · visible only to you
                    </p>
                  )}
                </>
              ) : (
                <Placeholder loading={q.isLoading} />
              )}
            </Glass>
            {[india, global].map((s, i) => (
              <Glass key={i} className="p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <Label>{i === 0 ? "India equities" : "Global equities"}</Label>
                  {s && (
                    <span className="text-[12px] font-light text-white/40">{s.count} holdings</span>
                  )}
                </div>
                {s ? (
                  <>
                    <div className="mt-6 text-[13px] font-light text-white/50">Today</div>
                    <Figure className={tone(s.dayChangePct)}>{pct(s.dayChangePct, 1)}</Figure>
                    <div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-[13px] font-light">
                      <span className="text-white/50">Return on cost</span>
                      <span className={cn("tabular", tone(s.returnPct))}>
                        {pct(s.returnPct, 1)}
                      </span>
                    </div>
                    {d?.owner && s.value != null && (
                      <div className="mt-2 flex justify-between text-[13px] font-light">
                        <span className="text-white/50">Value</span>
                        <span className="tabular">{moneyCompact(s.value, s.currency)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <Placeholder loading={q.isLoading} />
                )}
              </Glass>
            ))}
          </div>
        </section>

        {d && d.holdings.length > 0 && <Ticker holdings={d.holdings} />}

        {/* Portfolio */}
        <section
          id="portfolio"
          className="mx-auto max-w-[1200px] scroll-mt-20 px-5 pt-24 sm:px-8 sm:pt-32"
        >
          <SectionHead
            kicker="Portfolio"
            title="My portfolio"
            sub={d?.owner ? "Amounts visible to you" : undefined}
          />
          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {(["india", "global"] as const).map((seg) => (
              <HoldingList
                key={seg}
                title={seg === "india" ? "India equities" : "Global equities"}
                source={seg === "india" ? "Zerodha Kite" : "Revolut"}
                rows={(d?.holdings ?? []).filter((h) => h.segment === seg)}
                loading={q.isLoading}
                owner={!!d?.owner}
                linkable={!!session}
              />
            ))}
          </div>
        </section>

        {/* Private companies */}
        <section
          id="private"
          className="mx-auto max-w-[1200px] scroll-mt-20 px-5 pt-24 sm:px-8 sm:pt-32"
        >
          <SectionHead
            kicker="Private companies"
            title="Tracking and invested"
            sub="Names and documents visible only after sign in"
          />
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:gap-4">
            {(
              [
                ["Tracking", d?.private.tracking],
                ["Invested", d?.private.invested],
              ] as const
            ).map(([label, n]) => (
              <Glass key={label} className="p-5 sm:p-8">
                <Label>{label}</Label>
                <div className="tabular mt-5 text-[44px] leading-none font-extralight tracking-tight sm:text-[72px]">
                  {n ?? "—"}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[12px] font-light text-white/35">
                  <Lock className="size-3" aria-hidden /> private
                </div>
              </Glass>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="mx-auto flex max-w-[1200px] flex-col items-center px-5 py-28 text-center sm:px-8 sm:py-40">
          <h2 className="text-[38px] leading-[1.05] font-light tracking-[-0.04em] sm:text-[64px]">
            See it with sample data
          </h2>
          <p className="mt-5 max-w-lg text-[16px] font-light text-white/55">
            Every page of the dashboard with fictional figures
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/demo/india"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-medium text-[#03140d] shadow-[0_0_40px_rgba(255,255,255,0.18)]"
            >
              View the demo
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-8 text-[12px] font-light text-white/40 sm:flex-row sm:justify-between sm:px-8">
          <span>
            Prices from Yahoo Finance and Kite
            {pricesAt &&
              ` · last quote ${formatDistanceToNowStrict(new Date(pricesAt), { addSuffix: true })}`}
            {" · "}not investment advice
          </span>
          <span>Built with Claude Code · Supabase · Vercel · © John Thomas</span>
        </div>
      </footer>
    </div>
  );
}

// ---- pieces ----

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(22,101,64,0.55), transparent 70%), radial-gradient(40% 40% at 90% 20%, rgba(13,148,136,0.18), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 25%, transparent 75%)",
        }}
      />
      <div className="absolute top-[1400px] left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-[#166540] opacity-20 blur-[160px]" />
    </div>
  );
}

function Glass({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[12px] font-normal tracking-[0.12em] text-white/50 uppercase">
      {children}
    </div>
  );
}

function Figure({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "tabular mt-1 text-[44px] leading-none font-extralight tracking-[-0.04em] sm:text-[52px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Placeholder({ loading }: { loading: boolean }) {
  return loading ? (
    <div className="mt-6 space-y-3">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="h-2 w-full animate-pulse rounded-full bg-white/[0.06]" />
    </div>
  ) : (
    <p className="mt-6 text-[14px] font-light text-white/45">Live figures unavailable right now</p>
  );
}

function LivePill({ at, loading }: { at: string | null; loading: boolean }) {
  const fresh = at ? Date.now() - new Date(at).getTime() < 20 * 60_000 : false;
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-[13px] font-light text-white/75">
      <span className="relative flex size-2">
        {fresh && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#5ef0b0] opacity-70" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            fresh ? "bg-[#5ef0b0]" : "bg-white/50",
          )}
        />
      </span>
      {loading
        ? "Connecting to markets"
        : at
          ? `${fresh ? "Markets live" : "Markets closed"} · India · US · Private`
          : "Personal investment office · India · US · Private"}
    </span>
  );
}

function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string | undefined;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-[12px] tracking-[0.16em] text-[#5ef0b0]/80 uppercase">{kicker}</div>
      <h2 className="mt-4 max-w-3xl text-[34px] leading-[1.06] font-light tracking-[-0.035em] sm:text-[52px]">
        {title}
      </h2>
      {sub && <p className="mt-4 max-w-xl text-[15px] font-light text-white/50">{sub}</p>}
    </div>
  );
}

function Ticker({ holdings }: { holdings: PublicHolding[] }) {
  const items = holdings.filter((h) => h.dayChangePct != null);
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="relative mt-16 overflow-hidden border-y border-white/[0.06] py-4 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="landing-marquee flex w-max gap-12 pr-12">
        {row.map((h, i) => (
          <span key={i} className="flex items-center gap-2.5 text-[13px] whitespace-nowrap">
            <span className="font-normal text-white/80">{h.symbol}</span>
            <span className={cn("tabular font-light", tone(h.dayChangePct))}>
              {pct(h.dayChangePct, 2)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function HoldingList({
  title,
  source,
  rows,
  loading,
  owner,
  linkable,
}: {
  title: string;
  source: string;
  rows: PublicHolding[];
  loading: boolean;
  owner: boolean;
  linkable: boolean;
}) {
  const cols =
    "grid shrink-0 grid-cols-[52px_60px_52px] gap-3 text-right sm:grid-cols-[60px_64px_56px]";
  return (
    <Glass className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <span>
          <span className="text-[15px]">{title}</span>
          <span className="ml-2 text-[12px] font-light text-white/40 max-sm:hidden">{source}</span>
        </span>
        <span className={cn(cols, "text-[11px] tracking-[0.1em] text-white/40 uppercase")}>
          <span>Weight</span>
          <span>Today</span>
          <span>Return</span>
        </span>
      </div>
      {loading ? (
        <div className="space-y-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.05]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-6 py-8 text-[14px] font-light text-white/45">No holdings to show</p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {rows.map((h) => {
            const inner = (
              <>
                <CompanyLogo name={h.name} website={h.website} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px]">{h.name}</div>
                  {owner && h.value != null && (
                    <div className="tabular text-[11px] font-light text-white/40">
                      {moneyCompact(h.value, h.currency)}
                    </div>
                  )}
                </div>
                <span className={cn(cols, "text-[14px] font-light")}>
                  <span className="tabular text-white/70">{pct(h.segmentWeightPct, 1, false)}</span>
                  <span className={cn("tabular", tone(h.dayChangePct))}>
                    {pct(h.dayChangePct, 1)}
                  </span>
                  <span className={cn("tabular", tone(h.returnPct))}>{pct(h.returnPct, 0)}</span>
                </span>
              </>
            );
            return (
              <li key={h.symbol}>
                {linkable ? (
                  <Link
                    to={`/app/holding/${encodeURIComponent(h.symbol)}`}
                    className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-white/[0.03] sm:px-6"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3.5 px-5 py-3 sm:px-6">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Glass>
  );
}
