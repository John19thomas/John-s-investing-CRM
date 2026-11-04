import { motion } from "motion/react";
import { pct } from "@/lib/format";

export type WeightRow = { key: string; label: string; sub?: string | undefined; value: number };

/**
 * Allocation as sorted horizontal bars (single hue = magnitude). Top N shown, the rest
 * folded into "Other". Values are labelled in ink, never in the bar colour.
 */
export function WeightBars({
  rows,
  top = 8,
  format,
}: {
  rows: WeightRow[];
  top?: number;
  format: (n: number) => string;
}) {
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return null;
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, top);
  const rest = sorted.slice(top).reduce((a, r) => a + r.value, 0);
  if (rest > 0)
    shown.push({ key: "__other", label: `Other (${sorted.length - top})`, value: rest });
  const max = Math.max(...shown.map((r) => r.value));

  return (
    <ul className="space-y-3.5 px-5 pt-4 pb-5 sm:px-6">
      {shown.map((r, i) => (
        <li
          key={r.key}
          className="group"
          title={`${r.label}: ${format(r.value)} · ${pct((r.value / total) * 100, 1, false)}`}
        >
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">
              <span className="font-medium">{r.label}</span>
              {r.sub && <span className="ml-1.5 text-ink-3">{r.sub}</span>}
            </span>
            <span className="tabular shrink-0 text-ink-2">
              <span className="mr-2 hidden text-ink-3 group-hover:inline">{format(r.value)}</span>
              {pct((r.value / total) * 100, 1, false)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-paper-2">
            <motion.div
              className="h-2 rounded-full"
              style={{ background: r.key === "__other" ? "var(--ink-3)" : "var(--series-1)" }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(r.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
