import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Clock,
  FileText,
  Globe2,
  Landmark,
  LineChart,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { BrandMark, Wordmark } from "@/components/app/Wordmark";
import { CompanyLogo } from "@/components/holdings/CompanyLogo";
import { DEMO_INFO } from "@/data/demoResearch";

// Landing palette: one colour per part of the dashboard, used consistently on this page.
const C = {
  india: { solid: "#ff7a1a", soft: "#fff0e3", ink: "#8a3a00" },
  global: { solid: "#3355ff", soft: "#e8ecff", ink: "#1a2fa3" },
  private: { solid: "#12a26b", soft: "#e2f6ec", ink: "#0a5a3b" },
  research: { solid: "#7b4dff", soft: "#efe9ff", ink: "#4421b8" },
  night: "#0c1030",
} as const;

const SECTIONS = [
  {
    n: "01",
    to: "/demo/india",
    title: "India equities",
    body: "Stocks held with Zerodha, synced from Kite. Weight, return, entry price, holding period and XIRR for every stock.",
    source: "Synced from Zerodha Kite",
    icon: Landmark,
    color: C.india,
    stat: "₹24.1L",
    statSub: "11 stocks",
  },
  {
    n: "02",
    to: "/demo/revolut",
    title: "Global equities",
    body: "US and European stocks held with Revolut. Upload the statement CSV and positions, cost and XIRR update.",
    source: "Imported from Revolut CSV",
    icon: Globe2,
    color: C.global,
    stat: "$50.9K",
    statSub: "9 positions",
  },
  {
    n: "03",
    to: "/demo/private/global",
    title: "Private company tracker",
    body: "Private companies invested in or tracked, as a board: Tracking, Invested, Passed. Memos, decks and notes sit with each company.",
    source: "Notes, memos and decks",
    icon: Building2,
    color: C.private,
    stat: "7",
    statSub: "companies",
  },
] as const;

const PURPOSE = [
  {
    icon: LineChart,
    color: C.india,
    title: "See the whole portfolio",
    body: "Public stocks in India and abroad, plus private companies, on one screen instead of three apps and a spreadsheet.",
  },
  {
    icon: Clock,
    color: C.global,
    title: "Know how each holding is doing",
    body: "Blended entry price, how long it has been held, return and XIRR, calculated from the actual trades.",
  },
  {
    icon: FileText,
    color: C.research,
    title: "Remember why I own it",
    body: "Every company has a page with what it does, its financials and valuation, and a short memo on the reason for holding it.",
  },
] as const;

const FEATURED = [
  "RELIANCE",
  "INFY",
  "HDFCBANK",
  "BHARTIARTL",
  "TITAN",
  "LT",
  "NVDA",
  "MSFT",
  "ASML",
  "TSM",
  "AMZN",
  "META",
];

const STEPS = [
  {
    title: "Connect",
    body: "Log in to Zerodha Kite. The connection reads holdings only and cannot place orders.",
    color: C.india,
  },
  {
    title: "Import",
    body: "Upload a Revolut statement. Positions and average cost are shown for review before saving.",
    color: C.global,
  },
  {
    title: "Research",
    body: "Claude reads each company's filings and investor-relations site, then writes a description, financials and a memo.",
    color: C.research,
  },
  {
    title: "Add context",
    body: "Upload IC memos, decks and notes for private companies. Claude summarises each document and lists the key metrics.",
    color: C.private,
  },
] as const;

export default function Landing() {
  const { session } = useAuth();
  const signIn = session ? "/app/india" : "/login";

  return (
    <div className="min-h-dvh overflow-x-hidden bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5 sm:px-8">
          <Wordmark />
          <nav className="ml-auto flex items-center gap-2 text-[15px] whitespace-nowrap">
            <Link to="/demo/india" className="px-3 py-2 text-ink-2 hover:text-ink max-sm:hidden">
              Demo
            </Link>
            <Link
              to={signIn}
              className="rounded-full bg-ink px-4 py-2 font-medium text-paper transition-opacity hover:opacity-85"
            >
              {session ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 pt-14 pb-20 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-28">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium"
              style={{ background: C.research.soft, color: C.research.ink }}
            >
              <span className="size-1.5 rounded-full" style={{ background: C.research.solid }} />
              JT's investing dashboard
            </span>
            <h1 className="font-display mt-6 text-[46px] leading-[1.02] sm:text-[72px]">
              Every investment I hold,{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">in one place</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-[0.08em] -z-0 h-[0.32em] rounded-sm"
                  style={{ background: "#ffd84d" }}
                />
              </span>
              .
            </h1>
            <p className="mt-7 max-w-xl text-[18px] leading-relaxed text-ink-2">
              A personal dashboard that brings together Indian stocks, global stocks and private
              companies. It shows how each holding is performing and keeps the research on why it
              was bought.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/demo/india"
                className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-85"
              >
                Explore the demo
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                to={signIn}
                className="inline-flex items-center rounded-full border border-ink/15 px-6 py-3.5 text-[15px] font-medium hover:border-ink/40"
              >
                {session ? "Open dashboard" : "Sign in"}
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-ink-3">The demo uses sample data.</p>
          </div>

          <HeroMosaic />
        </section>

        {/* Purpose */}
        <section style={{ background: C.night }} className="text-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
            <p className="text-[13px] font-medium tracking-[0.12em] text-white/60 uppercase">
              What it is for
            </p>
            <h2 className="font-display mt-4 max-w-3xl text-[34px] leading-[1.08] sm:text-[48px]">
              Three questions, answered at a glance.
            </h2>
            <ul className="mt-14 grid gap-5 md:grid-cols-3">
              {PURPOSE.map((p) => (
                <li
                  key={p.title}
                  className="rounded-[22px] bg-white/[0.06] p-7 ring-1 ring-white/10"
                >
                  <span
                    className="grid size-11 place-items-center rounded-[14px]"
                    style={{ background: p.color.solid }}
                  >
                    <p.icon className="size-5 text-white" aria-hidden />
                  </span>
                  <h3 className="mt-6 text-[21px] font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/70">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Sections */}
        <section id="sections" className="mx-auto max-w-[1240px] px-5 pt-24 sm:px-8 sm:pt-32">
          <SectionLabel>Inside the dashboard</SectionLabel>
          <h2 className="font-display mt-4 max-w-3xl text-[34px] leading-[1.08] sm:text-[48px]">
            Three tabs, one for each kind of investment.
          </h2>
          <ul className="mt-12 grid gap-5 lg:grid-cols-3">
            {SECTIONS.map((s) => (
              <li key={s.n}>
                <Link
                  to={s.to}
                  className="group flex h-full flex-col rounded-[26px] p-7 transition-transform hover:-translate-y-1 sm:p-8"
                  style={{ background: s.color.soft }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="grid size-12 place-items-center rounded-[14px]"
                      style={{ background: s.color.solid }}
                    >
                      <s.icon className="size-5 text-white" aria-hidden />
                    </span>
                    <span
                      className="grid size-10 place-items-center rounded-full bg-white transition-transform group-hover:rotate-45"
                      style={{ color: s.color.ink }}
                    >
                      <ArrowUpRight className="size-5" aria-hidden />
                    </span>
                  </div>
                  <span
                    className="tabular mt-8 text-[13px] font-medium"
                    style={{ color: s.color.ink }}
                  >
                    {s.n}
                  </span>
                  <h3 className="mt-1 text-[26px] font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                  <div className="mt-auto flex items-end justify-between gap-4 pt-10">
                    <div>
                      <div className="text-[34px] leading-none font-semibold tracking-tight">
                        {s.stat}
                      </div>
                      <div className="mt-1.5 text-[13px] text-ink-3">{s.statSub} · demo</div>
                    </div>
                    <span
                      className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium"
                      style={{ color: s.color.ink }}
                    >
                      {s.source}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Portfolio */}
        <section className="mx-auto max-w-[1240px] px-5 pt-24 sm:px-8 sm:pt-32">
          <SectionLabel>Company pages</SectionLabel>
          <h2 className="font-display mt-4 max-w-3xl text-[34px] leading-[1.08] sm:text-[48px]">
            Every holding opens to a page on the company.
          </h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">
            What it does, revenue, margins, free cash flow and valuation multiples, the latest
            investor presentation, and a memo on why it is held.
          </p>
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED.map((sym, i) => {
              const info = DEMO_INFO[sym]!;
              const tint = [C.india, C.global, C.private, C.research][i % 4]!;
              return (
                <li key={sym} className={i >= 4 ? "max-sm:hidden" : undefined}>
                  <Link
                    to={`/demo/holding/${sym}`}
                    className="group flex h-full flex-col rounded-[22px] border border-line bg-paper p-6 transition-colors hover:border-transparent"
                    style={{ ["--tint" as string]: tint.soft }}
                  >
                    <div className="flex items-center justify-between">
                      <CompanyLogo name={info[0]} website={info[1]} size={48} />
                      <span
                        className="rounded-full px-2.5 py-1 text-[12px] font-medium"
                        style={{ background: tint.soft, color: tint.ink }}
                      >
                        {sym}
                      </span>
                    </div>
                    <h3 className="mt-5 text-[18px] font-semibold tracking-tight">{info[0]}</h3>
                    <p className="mt-1 text-[13px] text-ink-3">{info[2]}</p>
                    <p className="mt-3 line-clamp-3 text-[14px] leading-snug text-ink-2">
                      {info[4]}
                    </p>
                    <span className="mt-auto pt-6 text-[13px] font-medium text-ink-3 transition-colors group-hover:text-ink">
                      View company →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-[1240px] px-5 pt-24 sm:px-8 sm:pt-32">
          <SectionLabel>How it works</SectionLabel>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[22px] bg-paper-2 p-7">
                <span
                  className="tabular grid size-10 place-items-center rounded-full text-[15px] font-semibold text-white"
                  style={{ background: s.color.solid }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-6 text-[21px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Details */}
        <section className="mx-auto max-w-[1240px] px-5 pt-24 sm:px-8 sm:pt-32">
          <SectionLabel>Details</SectionLabel>
          <dl className="mt-6 grid gap-x-12 sm:grid-cols-2">
            {[
              ["Access", "Private. Real data requires sign-in. The public demo uses sample data."],
              ["Security", "Stored in Supabase. Each row is restricted to its owner."],
              ["Broker access", "Read-only. No orders can be placed from this dashboard."],
              ["Devices", "Works on phone and laptop."],
              ["Built with", "Claude Code, Supabase, React and Vercel."],
              ["Source", "Versioned on GitHub."],
            ].map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[120px_1fr] gap-4 border-b border-line py-5 text-[15px]"
              >
                <dt className="text-ink-3">{k}</dt>
                <dd className="text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32">
          <div
            className="relative overflow-hidden rounded-[30px] px-7 py-14 text-white sm:px-14 sm:py-20"
            style={{ background: C.global.solid }}
          >
            <span
              aria-hidden
              className="absolute -top-16 -right-16 size-64 rounded-full"
              style={{ background: C.india.solid }}
            />
            <span
              aria-hidden
              className="absolute right-40 -bottom-20 size-48 rounded-full max-sm:hidden"
              style={{ background: C.private.solid }}
            />
            <span
              aria-hidden
              className="absolute top-10 right-56 size-16 rounded-full max-md:hidden"
              style={{ background: "#ffd84d" }}
            />
            <div className="relative max-w-xl">
              <h2 className="font-display text-[34px] leading-[1.06] sm:text-[52px]">
                See it with sample data.
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-white/85">
                The demo has every tab working, with fictional private companies and real public
                tickers.
              </p>
              <Link
                to="/demo/india"
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-medium text-ink"
              >
                Explore the demo
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="flex items-center gap-2.5">
            <BrandMark className="size-4 gap-[2px]" />© {new Date().getFullYear()} John Thomas
          </span>
          <span>For personal use. Not investment advice.</span>
        </div>
      </footer>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] font-medium tracking-[0.12em] text-ink-3 uppercase">{children}</p>
  );
}

/** Colourful preview of the three tabs, built from the demo figures. */
function HeroMosaic() {
  const bars = [38, 52, 46, 61, 58, 72, 69, 84];
  return (
    <div className="relative">
      <div className="grid grid-cols-6 gap-3 sm:gap-4">
        <div
          className="col-span-6 rounded-[26px] p-6 text-white sm:col-span-4 sm:p-7"
          style={{ background: C.india.solid }}
        >
          <div className="flex items-center justify-between text-[13px] font-medium text-white/85">
            <span>India equities</span>
            <span className="rounded-full bg-white/20 px-2.5 py-1">Kite</span>
          </div>
          <div className="mt-6 text-[40px] leading-none font-semibold tracking-tight">₹24.1L</div>
          <div className="mt-2 text-[13px] text-white/85">11 stocks · sample data</div>
          <div className="mt-6 flex h-16 items-end gap-1.5" aria-hidden>
            {bars.map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-md bg-white/80"
                style={{ height: `${h}%`, opacity: 0.45 + i * 0.07 }}
              />
            ))}
          </div>
        </div>
        <div
          className="col-span-3 flex flex-col justify-between rounded-[26px] p-6 sm:col-span-2"
          style={{ background: "#ffd84d" }}
        >
          <span className="text-[13px] font-medium text-ink/70">Per holding</span>
          <ul className="space-y-1.5 text-[15px] font-semibold tracking-tight">
            <li>Entry price</li>
            <li>Holding period</li>
            <li>XIRR</li>
          </ul>
        </div>
        <div
          className="col-span-3 rounded-[26px] p-6 text-white sm:col-span-2"
          style={{ background: C.global.solid }}
        >
          <span className="text-[13px] font-medium text-white/85">Global equities</span>
          <div className="mt-5 text-[30px] leading-none font-semibold tracking-tight">$50.9K</div>
          <div className="mt-2 text-[12px] text-white/85">9 positions</div>
        </div>
        <div
          className="col-span-6 rounded-[26px] p-6 sm:col-span-4"
          style={{ background: C.private.soft }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium" style={{ color: C.private.ink }}>
              Private company tracker
            </span>
            <span className="text-[12px] text-ink-3">7 companies</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
            {[
              ["Tracking", 4, C.research],
              ["Invested", 2, C.private],
              ["Passed", 1, { solid: "#8a8a8a" }],
            ].map(([label, n, col]) => (
              <div key={label as string} className="rounded-[14px] bg-white p-3">
                <span className="flex items-center gap-1.5 text-ink-3">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: (col as { solid: string }).solid }}
                  />
                  {label as string}
                </span>
                <span className="mt-1 block text-[22px] font-semibold tracking-tight text-ink">
                  {n as number}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span
        aria-hidden
        className="absolute -top-5 -right-3 -z-10 size-28 rounded-full max-sm:hidden"
        style={{ background: C.research.solid, opacity: 0.9 }}
      />
    </div>
  );
}
