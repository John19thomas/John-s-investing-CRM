import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight, Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { BrandMark } from "@/components/app/Wordmark";
import { CompanyLogo } from "@/components/holdings/CompanyLogo";
import { moneyCompact, pct } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
// Flat deep green · heavy uppercase Inter headlines · serif statements · tracked uppercase
// labels · thin outlined line art. Copy uses no commas or full stops; "·" separates.

const GAIN = "text-[#6fdc95]";
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
    <div className="relative min-h-dvh overflow-x-hidden bg-[#0a1c15] text-white">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-20 max-w-[1320px] items-center gap-8 px-5 sm:px-10">
          <Link to="/" className="inline-flex items-center gap-3" aria-label="Home">
            <BrandMark className="size-5 gap-[2px]" />
            <span className="text-[14px] font-bold tracking-[0.22em] uppercase">
              JT<span className="max-[420px]:hidden"> · Investing</span>
            </span>
          </Link>
          <nav className="label-caps ml-auto flex items-center gap-7 whitespace-nowrap sm:gap-9">
            <a href="#portfolio" className="text-white/45 hover:text-white max-md:hidden">
              Portfolio
            </a>
            <a href="#private" className="text-white/45 hover:text-white max-md:hidden">
              Private
            </a>
            <Link to="/demo/india" className="text-white/45 hover:text-white max-sm:hidden">
              Demo
            </Link>
            <Link to={enter} className="text-white hover:text-[#6fcf8f]">
              {session ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero: line art behind · heavy headline bottom-left */}
        <section className="relative flex min-h-[92dvh] items-end overflow-hidden">
          <LineArt />
          <div className="relative mx-auto w-full max-w-[1320px] px-5 pb-16 sm:px-10 sm:pb-24">
            <LivePill at={pricesAt} loading={q.isLoading} />
            <h1 className="mt-6 text-[17vw] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase sm:text-[118px] lg:text-[148px]">
              JT's portfolio
              <br />
              and pipeline
            </h1>
          </div>
        </section>

        {/* Statement with outlined holding name behind */}
        <Statement d={d} />

        {/* Live readout */}
        <section className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-10 sm:pt-32">
          <div className="grid border-t border-white/10 lg:grid-cols-3 lg:divide-x lg:divide-white/10">
            <Readout label="Allocation">
              {d?.allocation ? (
                <>
                  <div className="flex items-end justify-between gap-6">
                    <Figure>{pct(d.allocation.india, 0, false)}</Figure>
                    <Figure className="text-white/45">{pct(d.allocation.global, 0, false)}</Figure>
                  </div>
                  <div className="mt-5 flex h-[3px] overflow-hidden bg-white/10">
                    <div className="bg-[#6fcf8f]" style={{ width: `${d.allocation.india}%` }} />
                    <div className="bg-white/45" style={{ width: `${d.allocation.global}%` }} />
                  </div>
                  <div className="label-caps mt-3 flex justify-between text-white/40">
                    <span>India</span>
                    <span>Global</span>
                  </div>
                  {d.owner && d.totalInr != null && (
                    <p className="mt-4 text-[13px] text-white/50">
                      Total{" "}
                      <span className="tabular text-white">{moneyCompact(d.totalInr, "INR")}</span>{" "}
                      · visible only to you
                    </p>
                  )}
                </>
              ) : (
                <Placeholder loading={q.isLoading} />
              )}
            </Readout>
            {[india, global].map((s, i) => (
              <Readout
                key={i}
                label={`${i === 0 ? "India" : "Global"} today`}
                aside={s ? `${s.count} holdings` : undefined}
              >
                {s ? (
                  <>
                    <Figure className={tone(s.dayChangePct)}>{pct(s.dayChangePct, 1)}</Figure>
                    <div className="mt-5 flex justify-between text-[14px]">
                      <span className="text-white/50">Return on cost</span>
                      <span className={cn("tabular", tone(s.returnPct))}>
                        {pct(s.returnPct, 1)}
                      </span>
                    </div>
                    {d?.owner && s.value != null && (
                      <div className="mt-1.5 flex justify-between text-[14px]">
                        <span className="text-white/50">Value</span>
                        <span className="tabular">{moneyCompact(s.value, s.currency)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <Placeholder loading={q.isLoading} />
                )}
              </Readout>
            ))}
          </div>
        </section>

        {d && d.holdings.length > 0 && <Ticker holdings={d.holdings} />}

        {/* Portfolio */}
        <section
          id="portfolio"
          className="mx-auto max-w-[1320px] scroll-mt-10 px-5 pt-24 sm:px-10 sm:pt-36"
        >
          <SectionHead kicker="Portfolio" title="My portfolio" />
          {d?.owner && <p className="mt-4 text-[14px] text-white/45">Amounts visible to you</p>}
          <div className="mt-12 grid gap-x-12 gap-y-16 lg:grid-cols-2">
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
          className="mx-auto max-w-[1320px] scroll-mt-10 px-5 pt-24 sm:px-10 sm:pt-36"
        >
          <SectionHead kicker="Private companies" title="Tracking and invested" />
          <p className="mt-4 flex items-center gap-2 text-[14px] text-white/45">
            <Lock className="size-3.5" aria-hidden /> Names and documents visible only after sign in
          </p>
          <div className="mt-12 grid grid-cols-2 border-t border-white/10 sm:divide-x sm:divide-white/10">
            {(
              [
                ["Tracking", d?.private.tracking],
                ["Invested", d?.private.invested],
              ] as const
            ).map(([label, n], i) => (
              <div key={label} className={cn("pt-8", i === 1 && "pl-6 sm:pl-10")}>
                <div className="label-caps text-white/45">{label}</div>
                <div className="tabular mt-4 text-[72px] leading-none font-extrabold tracking-[-0.04em] sm:text-[140px]">
                  {n ?? "—"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="mx-auto max-w-[1320px] px-5 py-28 sm:px-10 sm:py-40">
          <p className="font-serif max-w-3xl text-[34px] leading-[1.1] sm:text-[56px]">
            Every page of the dashboard with fictional figures
          </p>
          <Link
            to="/demo/india"
            className="label-caps group mt-10 inline-flex items-center gap-3 rounded-[4px] bg-white px-6 py-4 text-[#0a1c15] transition-colors hover:bg-[#6fcf8f]"
          >
            View the demo
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="label-caps mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-8 text-white/35 sm:flex-row sm:justify-between sm:px-10">
          <span>
            Prices from Yahoo Finance and Kite
            {pricesAt &&
              ` · last quote ${formatDistanceToNowStrict(new Date(pricesAt), { addSuffix: true })}`}
          </span>
          <span>Not investment advice · © John Thomas</span>
        </div>
      </footer>
    </div>
  );
}

// ---- pieces ----

/** Original line motif: two nested rounded paths that step upward, stroked in fading green. */
function LineArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 900 600"
      fill="none"
      className="pointer-events-none absolute top-1/2 right-[-18%] h-[80%] -translate-y-1/2 opacity-80 sm:right-[-4%] lg:right-[4%]"
    >
      <defs>
        <linearGradient id="la" x1="0" y1="600" x2="900" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6fcf8f" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#6fcf8f" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <path
        d="M60 520 H300 C330 520 345 505 360 480 L420 380 C435 355 450 340 480 340 H620 C650 340 665 325 680 300 L740 200 C755 175 770 160 800 160 H860"
        stroke="url(#la)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M60 560 H320 C360 560 380 540 400 505 L455 410 C470 385 490 380 515 380 H640 C680 380 700 360 720 325 L775 230 C790 205 810 200 835 200 H860"
        stroke="url(#la)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="560" y="60" width="300" height="80" rx="40" stroke="url(#la)" strokeWidth="1.5" />
    </svg>
  );
}

function Statement({ d }: { d: Portfolio | null }) {
  // Cycle through the five largest positions for the outlined name and caption.
  const top = [...(d?.holdings ?? [])]
    .sort(
      (a, b) => (b.weightPct ?? b.segmentWeightPct ?? 0) - (a.weightPct ?? a.segmentWeightPct ?? 0),
    )
    .slice(0, 5);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (top.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % top.length), 4500);
    return () => clearInterval(t);
  }, [top.length]);
  const h = top[i % Math.max(top.length, 1)];
  const word = h ? h.name.split(/\s+/).slice(0, 2).join(" ") || h.symbol : null;

  return (
    <section className="relative overflow-hidden border-t border-white/[0.06]">
      {word && (
        <div
          key={h!.symbol}
          aria-hidden
          className="outline-type pointer-events-none absolute top-1/2 left-1/2 w-[120%] -translate-x-[30%] -translate-y-1/2 animate-in text-[18vw] duration-1000 fade-in lg:text-[200px]"
        >
          {word}
        </div>
      )}
      <div className="relative mx-auto max-w-[1320px] px-5 py-28 sm:px-10 sm:py-40">
        <p className="font-serif max-w-4xl text-[34px] leading-[1.08] sm:text-[64px]">
          A consolidated dashboard of listed holdings in India and the US and the private companies
          I track and invest in
        </p>
        {h && (
          <p className="mt-12 text-right text-[15px] text-[#6fcf8f] sm:text-[17px]">
            {h.name} ·{" "}
            {h.weightPct != null
              ? `${pct(h.weightPct, 1, false)} of portfolio`
              : `${pct(h.segmentWeightPct, 1, false)} of ${h.segment === "india" ? "India" : "Global"} equities`}
          </p>
        )}
      </div>
    </section>
  );
}

function Readout({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-white/10 py-8 lg:border-b-0 lg:px-8 lg:first:pl-0 lg:last:pr-0">
      <div className="flex items-center justify-between">
        <span className="label-caps text-white/45">{label}</span>
        {aside && <span className="text-[12px] text-white/35">{aside}</span>}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Figure({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "tabular text-[56px] leading-none font-extrabold tracking-[-0.045em] sm:text-[72px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Placeholder({ loading }: { loading: boolean }) {
  return loading ? (
    <div className="space-y-3">
      <div className="h-14 w-2/3 animate-pulse bg-white/[0.06]" />
      <div className="h-[3px] w-full animate-pulse bg-white/[0.06]" />
    </div>
  ) : (
    <p className="text-[14px] text-white/45">Live figures unavailable right now</p>
  );
}

function LivePill({ at, loading }: { at: string | null; loading: boolean }) {
  const fresh = at ? Date.now() - new Date(at).getTime() < 20 * 60_000 : false;
  return (
    <span className="label-caps inline-flex items-center gap-2.5 text-white/55">
      <span className="relative flex size-2">
        {fresh && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#6fcf8f] opacity-70" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            fresh ? "bg-[#6fcf8f]" : "bg-white/45",
          )}
        />
      </span>
      {loading
        ? "Connecting to markets"
        : at
          ? `${fresh ? "Markets live" : "Markets closed"} · India · US · Private`
          : "India · US · Private"}
    </span>
  );
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="border-t border-white/10 pt-6">
      <div className="label-caps text-[#6fcf8f]">{kicker}</div>
      <h2 className="mt-5 text-[48px] leading-[0.9] font-extrabold tracking-[-0.04em] uppercase sm:text-[96px]">
        {title}
      </h2>
    </div>
  );
}

function Ticker({ holdings }: { holdings: PublicHolding[] }) {
  const items = holdings.filter((h) => h.dayChangePct != null);
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="relative mt-20 overflow-hidden border-y border-white/10 py-4 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="landing-marquee flex w-max gap-12 pr-12">
        {row.map((h, i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap">
            <span className="label-caps text-white/80">{h.symbol}</span>
            <span className={cn("tabular text-[13px]", tone(h.dayChangePct))}>
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
    <div>
      <div className="flex items-end justify-between border-b border-white/20 pb-3">
        <span>
          <span className="label-caps">{title}</span>
          <span className="ml-2 text-[12px] text-white/35 max-sm:hidden">{source}</span>
        </span>
        <span className={cn(cols, "label-caps text-[10px] text-white/40")}>
          <span>Weight</span>
          <span>Today</span>
          <span>Return</span>
        </span>
      </div>
      {loading ? (
        <div className="space-y-3 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse bg-white/[0.05]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-[14px] text-white/45">No holdings to show</p>
      ) : (
        <ul className="divide-y divide-white/[0.07]">
          {rows.map((h) => {
            const inner = (
              <>
                <CompanyLogo name={h.name} website={h.website} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px]">{h.name}</div>
                  {owner && h.value != null && (
                    <div className="tabular text-[11px] text-white/40">
                      {moneyCompact(h.value, h.currency)}
                    </div>
                  )}
                </div>
                <span className={cn(cols, "text-[14px]")}>
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
                    className="flex items-center gap-4 py-3.5 transition-colors hover:bg-white/[0.03]"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 py-3.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
