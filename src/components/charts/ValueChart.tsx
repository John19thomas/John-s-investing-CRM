import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SegmentedControl } from "@/components/app/primitives";
import type { Snapshot } from "@/data/types";
import { money, moneyCompact } from "@/lib/format";

const RANGES = { "1M": 30, "3M": 90, "6M": 180, All: 100000 } as const;
type Range = keyof typeof RANGES;

/** Portfolio value vs amount invested over time. Two series: legend + direct end labels. */
export function ValueChart({ data, currency }: { data: Snapshot[]; currency: string }) {
  const [range, setRange] = useState<Range>("6M");
  const rows = useMemo(() => data.slice(-RANGES[range]), [data, range]);

  if (data.length < 2) {
    return (
      <div className="flex h-[260px] items-center justify-center px-6 text-center text-sm text-ink-3">
        The value history fills in automatically: one point is saved every day you sync.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 sm:px-6">
        <div className="flex items-center gap-4 text-[13px] text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-series-1" aria-hidden /> Market value
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-ink-3" aria-hidden /> Invested
          </span>
        </div>
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={(Object.keys(RANGES) as Range[]).map((r) => ({ value: r, label: r }))}
        />
      </div>
      <div className="h-[260px] px-1 pt-2 sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
              tick={{ fill: "var(--ink-3)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={56}
            />
            <YAxis
              width={64}
              tickFormatter={(v: number) => moneyCompact(v, currency)}
              tick={{ fill: "var(--ink-3)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--ink-3)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as Snapshot | undefined;
                if (!active || !p) return null;
                const gain = p.current - p.invested;
                return (
                  <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] shadow-lg shadow-ink/5">
                    <div className="font-medium">{format(parseISO(p.date), "d MMM yyyy")}</div>
                    <div className="tabular mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
                      <span className="text-ink-3">Market value</span>
                      <span className="text-right">{money(p.current, currency, 0)}</span>
                      <span className="text-ink-3">Invested</span>
                      <span className="text-right">{money(p.invested, currency, 0)}</span>
                      <span className="text-ink-3">Gain</span>
                      <span className={gain >= 0 ? "text-right text-gain" : "text-right text-loss"}>
                        {gain >= 0 ? "+" : "−"}
                        {money(Math.abs(gain), currency, 0)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="invested"
              stroke="var(--ink-3)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke="var(--series-1)"
              strokeWidth={2}
              fill="url(#valueFill)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--series-1)",
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
