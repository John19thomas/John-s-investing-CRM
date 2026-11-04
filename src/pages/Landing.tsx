import {
  ArrowRight,
  ArrowUpRight,
  Database,
  FileText,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { Wordmark } from "@/components/app/Wordmark";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { IndiaVisual, PrivateVisual, RevolutVisual } from "@/components/landing/SectionVisuals";

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease },
};

const TICKER = [
  ["RELIANCE", "+0.84%"],
  ["NVDA", "+2.31%"],
  ["INFY", "+1.12%"],
  ["MSFT", "+0.46%"],
  ["HDFCBANK", "−0.42%"],
  ["ASML", "−0.91%"],
  ["BHARTIARTL", "+1.68%"],
  ["TSM", "+1.05%"],
  ["TITAN", "−1.24%"],
  ["GOOGL", "+0.77%"],
  ["ICICIBANK", "+0.95%"],
  ["VOO", "+0.38%"],
] as const;

const VIEWS = [
  {
    n: "01",
    to: "/demo/india",
    kicker: "Public markets · India",
    title: "India equities",
    body: "Stocks and mutual funds read straight from Zerodha Kite. One click to sync: value, P&L, today's movers and allocation, all live.",
    tags: ["Zerodha Kite Connect", "Read-only", "Daily history"],
    visual: <IndiaVisual />,
  },
  {
    n: "02",
    to: "/demo/revolut",
    kicker: "Public markets · Global",
    title: "Global equities",
    body: "US and European holdings at Revolut. Drop in the account statement CSV: trades are replayed into positions and average cost, previewed before saving.",
    tags: ["CSV import", "Average-cost engine", "Multi-currency"],
    visual: <RevolutVisual />,
  },
  {
    n: "03",
    to: "/demo/private/global",
    kicker: "Private markets",
    title: "Private & pipeline",
    body: "Portfolio companies and pipeline, split into Global and India books. Paste notes, upload IC memos: Claude reads every page and drafts the thesis, risks and metrics.",
    tags: ["Global · India", "Notes timeline", "AI-read IC memos"],
    visual: <PrivateVisual />,
  },
];

export default function Landing() {
  const { session } = useAuth();
  const appHref = session ? "/app/india" : "/login";

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-transparent bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-4 sm:px-6">
          <Wordmark />
          <nav className="hidden items-center gap-7 text-sm text-ink-2 md:flex">
            <a href="#views" className="hover:text-ink">
              The dashboard
            </a>
            <a href="#built" className="hover:text-ink">
              How it's built
            </a>
            <a href="#principles" className="hover:text-ink">
              Principles
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to={appHref}
              className="hidden rounded-full px-4 py-2 text-sm text-ink-2 hover:text-ink sm:block"
            >
              {session ? "Open dashboard" : "Sign in"}
            </Link>
            <Link
              to="/demo/india"
              className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85"
            >
              <span className="whitespace-nowrap">
                <span className="hidden sm:inline">Explore the </span>
                <span className="sm:hidden">View </span>demo
              </span>
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div
          className="paper-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-24 lg:pb-28">
          <div>
            <motion.p
              {...reveal}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-2"
            >
              <span className="size-1.5 rounded-full bg-gain" /> Personal investing dashboard · live
            </motion.p>
            <motion.h1
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.05 }}
              className="font-display mt-6 text-[56px] leading-[0.95] sm:text-[84px] lg:text-[104px]"
            >
              Every position.
              <br />
              <em className="text-ink-3">One view.</em>
            </motion.h1>
            <motion.p
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.12 }}
              className="mt-7 max-w-xl text-[18px] leading-relaxed text-ink-2"
            >
              Indian equities synced from Zerodha Kite, global equities from Revolut, and a
              private-markets pipeline where AI reads every IC memo. Designed and shipped by
              directing Claude Code.
            </motion.p>
            <motion.div
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.18 }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/demo/india"
                className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-85"
              >
                Explore the live demo
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <a
                href="#built"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3.5 text-[15px] font-medium transition-colors hover:bg-paper-2"
              >
                How it's built
              </a>
            </motion.div>
          </div>
          <HeroVisual />
        </div>

        {/* Ticker */}
        <div className="relative border-y border-line bg-surface py-3.5" aria-hidden>
          <div className="flex w-max animate-marquee gap-10 pr-10">
            {[...TICKER, ...TICKER].map(([t, c], i) => (
              <span
                key={i}
                className="tabular flex items-center gap-2 text-[13px] whitespace-nowrap"
              >
                <span className="font-semibold">{t}</span>
                <span className={c.startsWith("+") ? "text-gain" : "text-loss"}>{c}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Three views */}
      <section
        id="views"
        className="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32"
      >
        <motion.div {...reveal} className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="font-display text-[44px] leading-[1] sm:text-[64px]">
            Three views.
            <br />
            <em className="text-ink-3">One portfolio.</em>
          </h2>
          <p className="max-w-lg text-[17px] leading-relaxed text-ink-2 lg:justify-self-end">
            Each lens answers one question: what do I own in India, what do I own abroad, and what
            am I backing or watching in private markets?
          </p>
        </motion.div>

        <div className="mt-16 border-t border-ink">
          {VIEWS.map((v, i) => (
            <motion.div
              key={v.n}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.05 }}
            >
              <Link
                to={v.to}
                className="group grid gap-8 border-b border-line py-10 transition-colors hover:bg-surface/60 sm:py-12 lg:grid-cols-[80px_1fr_minmax(0,420px)] lg:gap-12 lg:px-4"
              >
                <span className="font-display text-[28px] text-ink-3">{v.n}</span>
                <div>
                  <p className="text-[12px] font-medium tracking-[0.14em] text-ink-3 uppercase">
                    {v.kicker}
                  </p>
                  <h3 className="font-display mt-2 flex items-center gap-3 text-[40px] leading-none sm:text-[52px]">
                    {v.title}
                    <ArrowUpRight
                      className="size-7 text-ink-3 transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-ink"
                      aria-hidden
                    />
                  </h3>
                  <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-2">{v.body}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {v.tags.map((t) => (
                      <li
                        key={t}
                        className="rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-2"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-line bg-paper-2/60 p-5 sm:p-6">
                  {v.visual}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Built with AI */}
      <section id="built" className="scroll-mt-16 bg-ink text-paper">
        <div className="mx-auto max-w-[1280px] px-4 py-24 sm:px-6 sm:py-32">
          <motion.div {...reveal} className="max-w-4xl">
            <p className="text-[12px] font-medium tracking-[0.14em] text-paper/50 uppercase">
              How it's built
            </p>
            <h2 className="font-display mt-4 text-[44px] leading-[1] sm:text-[72px]">
              Built by directing AI,
              <br />
              <em className="text-paper/50">not by hand-writing code.</em>
            </h2>
            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-paper/65">
              Every layer, from the database schema and security policies to the broker integration,
              the CSV engine and this page, was specified in plain English and built with Claude
              Code. Production stack, production practices.
            </p>
          </motion.div>

          <Architecture />

          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-paper/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "4",
                "serverless functions",
                "Kite sync · Revolut import · memo reader · AI analyst",
              ],
              ["12", "Postgres tables", "Every one locked with row-level security"],
              ["3", "data sources unified", "Zerodha, Revolut and private-market documents"],
              ["1", "codebase", "Front end, back end and schema, versioned in Git"],
            ].map(([n, k, d], i) => (
              <motion.div
                key={k}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.06 }}
                className="bg-ink p-6 sm:p-8"
              >
                <div className="text-[56px] leading-none font-semibold tracking-tight">{n}</div>
                <div className="mt-3 text-[15px] font-medium">{k}</div>
                <div className="mt-1 text-[13px] text-paper/50">{d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section
        id="principles"
        className="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32"
      >
        <motion.h2
          {...reveal}
          className="font-display max-w-3xl text-[44px] leading-[1] sm:text-[64px]"
        >
          Quiet by design.
        </motion.h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          <Principle icon={<ShieldCheck />} title="Read-only, always">
            The broker connection can read holdings and nothing else. No orders can ever be placed
            from here.
          </Principle>
          <Principle icon={<Lock />} title="Private by default">
            Real data sits behind sign-in and row-level security. The public demo runs on
            illustrative data with fictional private companies.
          </Principle>
          <Principle icon={<Smartphone />} title="Phone to laptop">
            Built mobile-first: tables become cards, tabs move to the thumb, and every chart stays
            legible on a phone.
          </Principle>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display text-[52px] leading-[0.95] sm:text-[88px]">
            Take a<br />
            <em className="text-ink-3">look around.</em>
          </h2>
          <Link
            to="/demo/india"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-[15px] font-medium text-paper transition-opacity hover:opacity-85"
          >
            Open the demo
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
        <footer className="mx-auto flex max-w-[1280px] flex-col gap-2 border-t border-line px-4 py-8 text-[13px] text-ink-3 sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} John Thomas. Not investment advice.</span>
          <span>Built with Claude Code · Supabase · React</span>
        </footer>
      </section>
    </div>
  );
}

function Principle({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.div {...reveal} className="border-t border-ink pt-6">
      <span className="grid size-10 place-items-center rounded-xl bg-ink text-paper [&>svg]:size-5">
        {icon}
      </span>
      <h3 className="mt-5 text-[20px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</p>
    </motion.div>
  );
}

function Architecture() {
  const sources = [
    ["Zerodha Kite", "Holdings API · daily login"],
    ["Revolut", "Account statement CSV"],
    ["IC memos & notes", "PDFs and pasted text"],
  ];
  return (
    <motion.div
      {...reveal}
      className="mt-16 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.2fr_auto_1fr]"
    >
      <div className="grid gap-3">
        {sources.map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-paper/15 px-5 py-4">
            <div className="font-medium">{t}</div>
            <div className="text-[13px] text-paper/50">{d}</div>
          </div>
        ))}
      </div>
      <Flow />
      <div className="rounded-2xl bg-paper/[0.06] p-5 ring-1 ring-paper/15">
        <div className="flex items-center gap-2 font-medium">
          <Database className="size-4" aria-hidden /> Supabase
        </div>
        <ul className="mt-4 grid gap-2 text-[13px] text-paper/70">
          {[
            "Postgres with row-level security",
            "Edge functions: kite-sync, revolut-import",
            "Private storage for documents",
            "Email sign-in",
          ].map((x) => (
            <li key={x} className="rounded-lg bg-paper/[0.06] px-3 py-2">
              {x}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-series-4/25 px-3 py-2 text-[13px]">
          <Sparkles className="size-4 shrink-0" aria-hidden /> Claude reads memos and answers
          questions
        </div>
      </div>
      <Flow />
      <div className="flex flex-col justify-center rounded-2xl bg-paper p-5 text-ink">
        <div className="flex items-center gap-2 font-medium">
          <FileText className="size-4" aria-hidden /> This dashboard
        </div>
        <p className="mt-2 text-[13px] text-ink-2">
          React + TypeScript on Vercel, responsive from phone to laptop.
        </p>
      </div>
    </motion.div>
  );
}

function Flow() {
  return (
    <div className="flex items-center justify-center py-1 text-paper/40" aria-hidden>
      <ArrowRight className="size-5 rotate-90 lg:rotate-0" />
    </div>
  );
}
