import { ArrowRight, FileSpreadsheet, FileText, Sparkles } from "lucide-react";
import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

export function IndiaVisual() {
  const bars = [
    ["RELIANCE", 92],
    ["INFY", 74],
    ["ICICIBANK", 70],
    ["HDFCBANK", 62],
    ["BHARTIARTL", 54],
    ["TCS", 48],
  ] as const;
  return (
    <div className="space-y-3">
      {bars.map(([k, w], i) => (
        <div key={k} className="grid grid-cols-[88px_1fr] items-center gap-3 text-[12px]">
          <span className="font-medium text-ink-2">{k}</span>
          <div className="h-2 rounded-full bg-paper-2">
            <motion.div
              className="h-2 rounded-full bg-series-1"
              initial={{ width: 0 }}
              whileInView={{ width: `${w}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.07, ease }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RevolutVisual() {
  const rows = [
    ["NVDA", "42", "+187%"],
    ["MSFT", "18", "+48%"],
    ["AAPL", "25", "+43%"],
    ["ASML", "6", "+9%"],
  ];
  return (
    <div className="flex items-center gap-3">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease }}
        className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-dashed border-ink/25 px-3 py-4 text-[11px] text-ink-3"
      >
        <FileSpreadsheet className="size-6 text-ink-2" aria-hidden />
        statement.csv
      </motion.div>
      <ArrowRight className="size-4 shrink-0 text-ink-3" aria-hidden />
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-line bg-surface">
        {rows.map(([t, q, r], i) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease }}
            className="tabular grid grid-cols-3 border-b border-line/70 px-3 py-2 text-[12px] last:border-0"
          >
            <span className="font-semibold">{t}</span>
            <span className="text-right text-ink-3">{q} sh</span>
            <span className="text-right text-gain">{r}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function PrivateVisual() {
  const cols = [
    { t: "Watching", c: "var(--series-4)", items: ["Monsoon Mobility", "Ledgerline"] },
    { t: "Evaluating", c: "var(--series-2)", items: ["Lumen Bio", "Saathi Health"] },
    { t: "Invested", c: "var(--series-1)", items: ["Northwind", "Kirana Cloud"] },
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col, ci) => (
          <div key={col.t}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
              <span className="size-1.5 rounded-full" style={{ background: col.c }} /> {col.t}
            </div>
            <div className="space-y-1.5">
              {col.items.map((it, i) => (
                <motion.div
                  key={it}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: ci * 0.12 + i * 0.08, duration: 0.5, ease }}
                  className="truncate rounded-lg border border-line bg-surface px-2 py-2 text-[11px] font-medium"
                >
                  {it}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="mt-3 flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[11px] text-ink-2"
      >
        <FileText className="size-3.5 shrink-0" aria-hidden />
        IC memo.pdf
        <ArrowRight className="size-3 shrink-0 text-ink-3" aria-hidden />
        <Sparkles className="size-3.5 shrink-0 text-series-4" aria-hidden />
        thesis · risks · metrics
      </motion.div>
    </div>
  );
}
