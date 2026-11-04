import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { Wordmark } from "@/components/app/Wordmark";
import { CompanyLogo } from "@/components/holdings/CompanyLogo";
import { DEMO_INFO } from "@/data/demoResearch";

const SECTIONS = [
  {
    n: "01",
    to: "/demo/india",
    title: "India equities",
    body: "Stocks and mutual funds held with Zerodha, synced from Kite. Entry price, holding period and XIRR per holding.",
    source: "Zerodha Kite",
  },
  {
    n: "02",
    to: "/demo/revolut",
    title: "Global equities",
    body: "Stocks held with Revolut, updated from the account statement CSV. Entry price, holding period and XIRR per holding.",
    source: "Revolut CSV",
  },
  {
    n: "03",
    to: "/demo/private/global",
    title: "Private company tracker",
    body: "Private companies invested in or tracked, split into Global and India. Analysis, notes and memos stored with each company.",
    source: "Notes and PDFs",
  },
];

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
    n: "1",
    title: "Connect",
    body: "Log in to Zerodha Kite. The connection can read holdings only; it cannot place orders.",
  },
  {
    n: "2",
    title: "Import",
    body: "Upload a Revolut statement. Positions and average cost are calculated and shown for review before saving.",
  },
  {
    n: "3",
    title: "Research",
    body: "Claude reads each company's filings and investor-relations site: description, latest presentation, financials and valuation, then writes a memo.",
  },
  {
    n: "4",
    title: "Add context",
    body: "Paste notes and upload IC memos for private companies. Claude summarises each document and lists the key metrics.",
  },
];

export default function Landing() {
  const { session } = useAuth();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5 sm:px-8">
          <Wordmark />
          <nav className="ml-auto flex items-center gap-1 text-[15px] whitespace-nowrap">
            <Link to="/demo/india" className="px-3 py-2 text-ink-2 hover:text-ink">
              Demo
            </Link>
            <Link
              to={session ? "/app/india" : "/login"}
              className="px-3 py-2 text-ink-2 hover:text-ink"
            >
              {session ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Intro */}
        <section className="mx-auto max-w-[1200px] px-5 pt-20 pb-20 sm:px-8 sm:pt-32 sm:pb-28">
          <h1 className="font-display max-w-4xl text-[44px] leading-[1.02] sm:text-[72px]">
            A personal dashboard for public and private investments.
          </h1>
          <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-ink-2">
            Indian equities, global equities and private companies in one place. Holdings update
            from Zerodha Kite and Revolut; private companies hold notes and documents.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              to="/demo/india"
              className="group inline-flex items-center gap-2 bg-ink px-6 py-3.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-85"
            >
              View demo
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              to={session ? "/app/india" : "/login"}
              className="text-[15px] font-medium underline decoration-line underline-offset-[6px] hover:decoration-ink"
            >
              {session ? "Open dashboard" : "Sign in"}
            </Link>
          </div>
        </section>

        {/* Snapshot (demo figures) */}
        <section className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="flex items-baseline justify-between border-t border-ink pt-4">
            <h2 className="text-[13px] font-medium tracking-[0.08em] text-ink-3 uppercase">
              Snapshot
            </h2>
            <span className="text-[13px] text-ink-3">Demo data</span>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-3">
            {[
              ["India equities", "₹24.1L", "11 stocks"],
              ["Global equities", "$50.9K", "9 positions"],
              ["Private company tracker", "7", "companies, 2 invested"],
            ].map(([k, v, d]) => (
              <div
                key={k}
                className="border-b border-line py-8 sm:border-b-0 sm:py-10 sm:pr-8 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:pl-8"
              >
                <dt className="text-[14px] text-ink-3">{k}</dt>
                <dd className="mt-3 text-[44px] leading-none font-medium tracking-tight sm:text-[56px]">
                  {v}
                </dd>
                <dd className="mt-3 text-[14px] text-ink-2">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Sections */}
        <section id="sections" className="mx-auto max-w-[1200px] px-5 pt-24 sm:px-8 sm:pt-32">
          <div className="border-t border-ink pt-4">
            <h2 className="text-[13px] font-medium tracking-[0.08em] text-ink-3 uppercase">
              Sections
            </h2>
          </div>
          <ul className="mt-2">
            {SECTIONS.map((s) => (
              <li key={s.n}>
                <Link
                  to={s.to}
                  className="group grid grid-cols-[36px_1fr_auto] items-baseline gap-x-4 gap-y-2 border-b border-line py-7 sm:grid-cols-[56px_minmax(0,1fr)_minmax(0,1.3fr)_180px_24px] sm:gap-x-8"
                >
                  <span className="tabular text-[14px] text-ink-3">{s.n}</span>
                  <span className="text-[22px] font-medium tracking-tight sm:text-[26px]">
                    {s.title}
                  </span>
                  <ArrowUpRight
                    className="size-5 self-center text-ink-3 transition-colors group-hover:text-ink sm:order-last"
                    aria-hidden
                  />
                  <span className="col-start-2 text-[15px] leading-relaxed text-ink-2 sm:col-start-auto">
                    {s.body}
                  </span>
                  <span className="col-start-2 text-[14px] text-ink-3 sm:col-start-auto">
                    {s.source}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Portfolio */}
        <section className="mx-auto max-w-[1200px] px-5 pt-24 sm:px-8 sm:pt-32">
          <div className="flex items-baseline justify-between border-t border-ink pt-4">
            <h2 className="text-[13px] font-medium tracking-[0.08em] text-ink-3 uppercase">
              Portfolio
            </h2>
            <span className="text-[13px] text-ink-3">Demo holdings</span>
          </div>
          <p className="font-display mt-8 max-w-3xl text-[32px] leading-[1.1] sm:text-[44px]">
            Every holding opens to a company page: what it does, its financials, valuation, and a
            memo on why it is held.
          </p>
          <ul className="mt-12 grid grid-cols-1 border-t border-l border-line sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED.map((sym) => {
              const info = DEMO_INFO[sym]!;
              return (
                <li key={sym} className="border-r border-b border-line bg-paper">
                  <Link
                    to={`/demo/holding/${sym}`}
                    className="group flex h-full flex-col p-6 transition-colors hover:bg-paper-2"
                  >
                    <CompanyLogo name={info[0]} website={info[1]} size={52} />
                    <h3 className="mt-6 text-[18px] font-semibold tracking-tight">{info[0]}</h3>
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
        <section className="mx-auto max-w-[1200px] px-5 pt-24 sm:px-8 sm:pt-32">
          <div className="border-t border-ink pt-4">
            <h2 className="text-[13px] font-medium tracking-[0.08em] text-ink-3 uppercase">
              How it works
            </h2>
          </div>
          <ol className="grid gap-10 pt-10 md:grid-cols-2 md:gap-12 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="tabular text-[14px] text-ink-3">{s.n}</span>
                <h3 className="mt-2 text-[22px] font-medium tracking-tight">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Details */}
        <section className="mx-auto max-w-[1200px] px-5 pt-24 pb-24 sm:px-8 sm:pt-32 sm:pb-32">
          <div className="border-t border-ink pt-4">
            <h2 className="text-[13px] font-medium tracking-[0.08em] text-ink-3 uppercase">
              Details
            </h2>
          </div>
          <dl className="grid gap-x-12 sm:grid-cols-2">
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
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-8 text-[13px] text-ink-3 sm:flex-row sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} John Thomas</span>
          <span>For personal use. Not investment advice.</span>
        </div>
      </footer>
    </div>
  );
}
