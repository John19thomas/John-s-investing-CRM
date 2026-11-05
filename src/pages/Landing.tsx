import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Lock,
  NotebookPen,
  Radio,
  ScrollText,
} from "lucide-react";
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

const tone = (x: number | null | undefined) =>
  x == null ? "text-white/40" : x >= 0 ? "text-[#3ee6a8]" : "text-[#ff6b81]";

export default function Landing() {
  const { session } = useAuth();
  const q = usePortfolio(!!session);
  const d = q.data && !q.data.empty ? q.data : null;
  const india = d?.segments.find((s) => s.key === "india");
  const global = d?.segments.find((s) => s.key === "global");
  const pricesAt = [india?.pricesAt, global?.pricesAt].filter(Boolean).sort().at(-1) ?? null;

  return (
    <div className="dark-landing relative min-h-dvh overflow-x-hidden bg-[#05060b] text-white">
      <Backdrop />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#05060b]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Home">
            <BrandMark />
            <span className="text-[16px] font-semibold tracking-tight">
              JT's <span className="font-normal text-white/50">investing dashboard</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-2 text-[14px] whitespace-nowrap">
            <Link
              to="/demo/india"
              className="px-3 py-2 text-white/60 transition-colors hover:text-white max-sm:hidden"
            >
              Demo
            </Link>
            <Link
              to={session ? "/app/india" : "/login"}
              className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 font-medium backdrop-blur transition-colors hover:bg-white/[0.12]"
            >
              {session ? "Open dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-[1240px] px-5 pt-16 sm:px-8 sm:pt-24">
          <div className="flex flex-wrap items-center gap-3 text-[12px] tracking-[0.14em] text-white/50 uppercase">
            <LivePill at={pricesAt} loading={q.isLoading} />
            <span>India · US · Private</span>
          </div>
          <h1 className="mt-7 max-w-5xl text-[44px] leading-[0.98] font-semibold tracking-[-0.045em] sm:text-[84px]">
            My portfolio,{" "}
            <span className="bg-gradient-to-r from-[#7c9cff] via-[#5ee7ff] to-[#3ee6a8] bg-clip-text text-transparent">
              live.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-white/60 sm:text-[19px]">
            Indian stocks, US stocks and private companies in one place. Prices update in real time,
            and every company has its key numbers, latest investor presentation and a cheatsheet
            refreshed after each quarterly result.
          </p>
        </section>

        {/* Live readout */}
        <section className="mx-auto mt-14 max-w-[1240px] px-5 sm:px-8">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
            <Glass className="p-6 sm:p-7">
              <Label>Allocation</Label>
              {d?.allocation ? (
                <>
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <Big>{pct(d.allocation.india, 0, false)}</Big>
                    <Big className="text-white/70">{pct(d.allocation.global, 0, false)}</Big>
                  </div>
                  <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#ff9a3c] to-[#ff6a3d]"
                      style={{ width: `${d.allocation.india}%` }}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-[#5b7cff] to-[#5ee7ff]"
                      style={{ width: `${d.allocation.global}%` }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-[13px] text-white/50">
                    <span>India equities</span>
                    <span>Global equities</span>
                  </div>
                  <p className="mt-5 text-[12px] text-white/35">
                    Share of total value, converted at the live USD/INR rate.
                  </p>
                  {d.owner && d.totalInr != null && (
                    <p className="mt-5 border-t border-white/10 pt-4 text-[13px] text-white/50">
                      Total{" "}
                      <span className="tabular font-medium text-white">
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
                  <Label>{s?.label ?? (i === 0 ? "India equities" : "Global equities")}</Label>
                  <span className="text-[12px] text-white/40">{s ? `${s.count} stocks` : ""}</span>
                </div>
                {s ? (
                  <>
                    <div className="mt-5 text-[13px] text-white/50">Today</div>
                    <Big className={tone(s.dayChangePct)}>{pct(s.dayChangePct, 2)}</Big>
                    <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-[13px]">
                      <div>
                        <div className="text-white/50">Return on cost</div>
                        <div
                          className={cn("tabular mt-1 text-[17px] font-medium", tone(s.returnPct))}
                        >
                          {pct(s.returnPct, 1)}
                        </div>
                      </div>
                      {d?.owner && s.value != null ? (
                        <div>
                          <div className="text-white/50">Value</div>
                          <div className="tabular mt-1 text-[17px] font-medium">
                            {moneyCompact(s.value, s.currency)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-white/50">Source</div>
                          <div className="mt-1 text-[15px] text-white/80">
                            {s.key === "india" ? "Zerodha Kite" : "Revolut"}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <Placeholder loading={q.isLoading} />
                )}
              </Glass>
            ))}
          </div>
        </section>

        {/* Ticker */}
        {d && d.holdings.length > 0 && <Ticker holdings={d.holdings} />}

        {/* Holdings */}
        <section className="mx-auto max-w-[1240px] px-5 pt-20 sm:px-8 sm:pt-28">
          <SectionHead
            kicker="Holdings"
            title="What I own, ranked by weight."
            aside={
              d?.owner
                ? "Amounts shown because you're signed in."
                : "Weights and returns only. Amounts stay private."
            }
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {(["india", "global"] as const).map((seg) => (
              <HoldingList
                key={seg}
                title={seg === "india" ? "India equities" : "Global equities"}
                rows={(d?.holdings ?? []).filter((h) => h.segment === seg)}
                loading={q.isLoading}
                owner={!!d?.owner}
                linkable={!!session}
              />
            ))}
          </div>
        </section>

        {/* Latest results */}
        {d && d.updates.length > 0 && (
          <section className="mx-auto max-w-[1240px] px-5 pt-20 sm:px-8 sm:pt-28">
            <SectionHead kicker="Latest results" title="What changed this quarter." />
            <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {d.updates.map((u) => (
                <li key={u.symbol}>
                  <Glass className="h-full p-6">
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={u.name} website={u.website} size={36} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.name}</div>
                        <div className="text-[12px] text-white/45">
                          {[u.period, u.date].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-[14px] leading-relaxed text-white/70">{u.headline}</p>
                  </Glass>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Company pages */}
        <section className="mx-auto max-w-[1240px] px-5 pt-20 sm:px-8 sm:pt-28">
          <SectionHead
            kicker="Company pages"
            title="Every holding opens to one page with the numbers that matter."
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Glass className="p-6 sm:p-8">
              <Label>Key numbers, per company</Label>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {["Revenue", "ARR", "Gross margin", "EBITDA", "Free cash flow", "Market cap"].map(
                  (m, i) => (
                    <div
                      key={m}
                      className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="text-[12px] text-white/45">{m}</div>
                      <div
                        className="mt-3 h-1.5 rounded-full"
                        style={{
                          width: `${48 + ((i * 17) % 45)}%`,
                          background: GRADS[i % GRADS.length],
                        }}
                      />
                    </div>
                  ),
                )}
              </div>
              <p className="mt-6 text-[14px] leading-relaxed text-white/55">
                From company filings and results, with the latest quarter alongside the last three
                years. Market cap moves with the live share price.
              </p>
            </Glass>
            <div className="grid gap-4">
              <Feature
                icon={<ScrollText className="size-5" />}
                title="Quarterly cheatsheet"
                body="Headline numbers, management commentary, guidance and product launches from the latest results. Rewritten automatically after each quarterly report."
              />
              <Feature
                icon={<FileText className="size-5" />}
                title="Latest investor presentation"
                body="A direct link to the most recent results deck or investor-day presentation."
              />
              <Feature
                icon={<NotebookPen className="size-5" />}
                title="Why I own it"
                body="Entry price, holding period and XIRR from actual trades, plus a short investment memo."
              />
            </div>
          </div>
        </section>

        {/* Private tracker */}
        <section className="mx-auto max-w-[1240px] px-5 pt-20 sm:px-8 sm:pt-28">
          <SectionHead
            kicker="Private company tracker"
            title="Private companies, from first look to investment."
            aside="Company names and deal documents are visible only after sign-in."
          />
          <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
            {(
              [
                ["Tracking", d?.private.tracking, "#7c9cff"],
                ["Invested", d?.private.invested, "#3ee6a8"],
                ["Passed", d?.private.passed, "#8b8fa3"],
              ] as const
            ).map(([label, n, color]) => (
              <Glass key={label} className="p-5 sm:p-7">
                <div className="flex items-center gap-2 text-[13px] text-white/55">
                  <span className="size-2 rounded-full" style={{ background: color }} />
                  {label}
                </div>
                <div className="tabular mt-4 text-[40px] leading-none font-semibold tracking-tight sm:text-[56px]">
                  {n ?? "—"}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-white/35">
                  <Lock className="size-3" aria-hidden /> names private
                </div>
              </Glass>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 p-8 sm:p-14">
            <div
              aria-hidden
              className="absolute inset-0 opacity-90"
              style={{
                background:
                  "radial-gradient(120% 140% at 0% 0%, rgba(124,156,255,0.35), transparent 55%), radial-gradient(90% 120% at 100% 100%, rgba(62,230,168,0.25), transparent 55%)",
              }}
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <h2 className="text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[48px]">
                  Walk through every screen.
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-white/65">
                  The demo has the full dashboard, company pages and private tracker, with sample
                  data in place of mine.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/demo/india"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-medium text-[#05060b]"
                >
                  Explore the demo
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <Link
                  to={session ? "/app/india" : "/login"}
                  className="inline-flex items-center rounded-full border border-white/20 px-6 py-3.5 text-[15px] font-medium hover:bg-white/10"
                >
                  {session ? "Open dashboard" : "Sign in"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-8 text-[12px] text-white/40 sm:flex-row sm:justify-between sm:px-8">
          <span>
            Prices from Yahoo Finance and Kite
            {pricesAt &&
              ` · last quote ${formatDistanceToNowStrict(new Date(pricesAt), { addSuffix: true })}`}
            . For personal use, not investment advice.
          </span>
          <span>Built with Claude Code, Supabase and Vercel · © John Thomas</span>
        </div>
      </footer>
    </div>
  );
}

// ---- pieces ----

const GRADS = [
  "linear-gradient(90deg,#7c9cff,#5ee7ff)",
  "linear-gradient(90deg,#b07cff,#7c9cff)",
  "linear-gradient(90deg,#3ee6a8,#5ee7ff)",
  "linear-gradient(90deg,#ff9a3c,#ff6a3d)",
];

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <div className="absolute -top-40 left-[8%] size-[520px] rounded-full bg-[#4f6bff] opacity-25 blur-[140px]" />
      <div className="absolute top-20 right-[-6%] size-[460px] rounded-full bg-[#17c3b2] opacity-20 blur-[140px]" />
      <div className="absolute top-[900px] left-[30%] size-[520px] rounded-full bg-[#7b4dff] opacity-[0.12] blur-[160px]" />
    </div>
  );
}

function Glass({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/[0.08] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className="text-[12px] tracking-[0.12em] text-white/50 uppercase">{children}</div>;
}

function Big({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "tabular mt-1 text-[40px] leading-none font-semibold tracking-[-0.04em] sm:text-[48px]",
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
      <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.06]" />
    </div>
  ) : (
    <p className="mt-6 text-[14px] text-white/45">Live figures are unavailable right now.</p>
  );
}

function LivePill({ at, loading }: { at: string | null; loading: boolean }) {
  const fresh = at ? Date.now() - new Date(at).getTime() < 20 * 60_000 : false;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 tracking-normal normal-case">
      <span className="relative flex size-2">
        {fresh && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3ee6a8] opacity-70" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            fresh ? "bg-[#3ee6a8]" : "bg-white/40",
          )}
        />
      </span>
      <Radio className="size-3.5 text-white/50" aria-hidden />
      {loading
        ? "Connecting…"
        : at
          ? `${fresh ? "Live prices" : "Last close"} · ${formatDistanceToNowStrict(new Date(at), { addSuffix: true })}`
          : "Prices unavailable"}
    </span>
  );
}

function SectionHead({ kicker, title, aside }: { kicker: string; title: string; aside?: string }) {
  return (
    <div className="flex flex-col gap-4 border-t border-white/10 pt-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-[12px] tracking-[0.14em] text-white/45 uppercase">{kicker}</div>
        <h2 className="mt-3 max-w-3xl text-[30px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[44px]">
          {title}
        </h2>
      </div>
      {aside && <p className="max-w-xs text-[13px] text-white/45 lg:text-right">{aside}</p>}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Glass className="flex gap-4 p-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-white/10 bg-gradient-to-br from-white/15 to-white/[0.02] text-white/90">
        {icon}
      </span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">{body}</p>
      </div>
    </Glass>
  );
}

function Ticker({ holdings }: { holdings: PublicHolding[] }) {
  const items = holdings.filter((h) => h.dayChangePct != null);
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="relative mt-14 overflow-hidden border-y border-white/[0.06] bg-white/[0.02] py-4 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="landing-marquee flex w-max gap-10 pr-10">
        {row.map((h, i) => (
          <span key={i} className="flex items-center gap-2.5 text-[14px] whitespace-nowrap">
            <span className="font-medium text-white/85">{h.symbol}</span>
            <span className={cn("tabular", tone(h.dayChangePct))}>{pct(h.dayChangePct, 2)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function HoldingList({
  title,
  rows,
  loading,
  owner,
  linkable,
}: {
  title: string;
  rows: PublicHolding[];
  loading: boolean;
  owner: boolean;
  linkable: boolean;
}) {
  const max = Math.max(...rows.map((r) => r.segmentWeightPct ?? 0), 1);
  return (
    <Glass className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <span className="font-medium">{title}</span>
        <span className="grid grid-cols-[64px_64px] gap-4 text-right text-[11px] tracking-[0.08em] text-white/40 uppercase max-sm:grid-cols-[56px]">
          <span>Today</span>
          <span className="max-sm:hidden">Return</span>
        </span>
      </div>
      {loading ? (
        <div className="space-y-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.05]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-6 py-8 text-[14px] text-white/45">No holdings to show.</p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {rows.map((h) => {
            const inner = (
              <>
                <CompanyLogo
                  name={h.name}
                  website={h.website}
                  size={34}
                  className="border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[14px] font-medium">{h.name}</span>
                    <span className="shrink-0 text-[11px] text-white/35 max-sm:hidden">
                      {h.symbol}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7c9cff] to-[#5ee7ff]"
                        style={{ width: `${((h.segmentWeightPct ?? 0) / max) * 100}%` }}
                      />
                    </div>
                    <span className="tabular w-12 shrink-0 text-right text-[11px] text-white/45">
                      {pct(h.segmentWeightPct, 1, false)}
                    </span>
                    {owner && h.value != null && (
                      <span className="tabular w-16 shrink-0 text-right text-[11px] text-white/45 max-sm:hidden">
                        {moneyCompact(h.value, h.currency)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="grid shrink-0 grid-cols-[64px_64px] gap-4 text-right text-[14px] max-sm:grid-cols-[56px]">
                  <span className={cn("tabular", tone(h.dayChangePct))}>
                    {pct(h.dayChangePct, 1)}
                  </span>
                  <span className={cn("tabular max-sm:hidden", tone(h.returnPct))}>
                    {pct(h.returnPct, 0)}
                  </span>
                </span>
              </>
            );
            return (
              <li key={h.symbol}>
                {linkable ? (
                  <Link
                    to={`/app/holding/${encodeURIComponent(h.symbol)}`}
                    className="group flex items-center gap-3.5 px-6 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    {inner}
                    <ArrowUpRight className="size-4 shrink-0 text-white/25 group-hover:text-white/70" />
                  </Link>
                ) : (
                  <div className="flex items-center gap-3.5 px-6 py-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Glass>
  );
}
