import { CheckCircle2, FileText, RefreshCw, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "@/components/app/primitives";
import { moneyCompact } from "@/lib/format";

// Illustrative product shot built from live UI pieces (not a screenshot), so it stays crisp.
const PATH = [42, 44, 41, 47, 46, 52, 50, 55, 53, 58, 61, 59, 64, 68, 66, 72, 75, 73, 79, 84];

function sparkPath(w: number, h: number) {
  const max = Math.max(...PATH);
  const min = Math.min(...PATH);
  return PATH.map((v, i) => {
    const x = (i / (PATH.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function HeroVisual() {
  const reduce = useReducedMotion();
  const line = sparkPath(420, 120);
  const float = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <motion.div
        {...float(0.15)}
        className="relative rounded-3xl border border-line bg-surface p-6 shadow-2xl shadow-ink/10 sm:p-7"
      >
        <div className="flex items-center justify-between text-[13px] text-ink-3">
          <span>Total portfolio · INR</span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-gain opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-gain" />
            </span>
            Live
          </span>
        </div>
        <div className="mt-2 text-[44px] leading-none font-semibold tracking-tight sm:text-[56px]">
          <AnimatedNumber value={7_590_000} format={(n) => moneyCompact(n, "INR")} />
        </div>
        <div className="mt-2 text-[14px] text-gain">↗ +₹19.8L (+35.3%) all time</div>
        <svg viewBox="0 0 420 130" className="mt-5 w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="heroFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 40, 80, 120].map((y) => (
            <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="var(--grid)" strokeWidth="1" />
          ))}
          <motion.path
            d={`${line} L420,130 L0,130 Z`}
            fill="url(#heroFill)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
          />
          <motion.circle
            cx="420"
            cy="0"
            r="5"
            fill="var(--series-1)"
            stroke="var(--surface)"
            strokeWidth="2"
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 2 }}
          />
        </svg>
        <div className="mt-5 grid grid-cols-3 gap-2 text-[12px]">
          {[
            ["India", "₹33.0L", "var(--series-1)"],
            ["Global", "$50.9K", "var(--series-2)"],
            ["Private", "7 cos.", "var(--series-4)"],
          ].map(([k, v, c]) => (
            <div key={k} className="rounded-xl bg-paper px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-ink-3">
                <span className="size-1.5 rounded-full" style={{ background: c }} /> {k}
              </div>
              <div className="mt-0.5 text-[15px] font-semibold">{v}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        {...float(0.9)}
        className="absolute -top-12 -left-4 hidden items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] shadow-xl shadow-ink/10 sm:flex lg:-left-16"
      >
        <RefreshCw className="size-4 text-series-1" aria-hidden />
        <div>
          <div className="font-medium">Zerodha Kite synced</div>
          <div className="text-ink-3">11 stocks · 3 funds · just now</div>
        </div>
      </motion.div>

      <motion.div
        {...float(1.3)}
        className="absolute -right-4 bottom-10 hidden max-w-[250px] rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] shadow-xl shadow-ink/10 sm:block lg:-right-14"
      >
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="size-4 text-series-4" aria-hidden /> IC memo read by Claude
        </div>
        <div className="mt-1.5 flex items-start gap-2 text-ink-3">
          <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Thesis, 4 risks and 6 metrics extracted from a 28-page memo
        </div>
      </motion.div>

      <motion.div
        {...float(1.7)}
        className="absolute -bottom-5 left-8 hidden items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] shadow-lg shadow-ink/10 sm:flex"
      >
        <CheckCircle2 className="size-4 text-gain" aria-hidden /> Revolut CSV imported · 9 positions
      </motion.div>
    </div>
  );
}
