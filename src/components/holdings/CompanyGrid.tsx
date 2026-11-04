import type { PositionStats } from "@shared/performance";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { Delta } from "@/components/app/primitives";
import { useRepo } from "@/data/RepoContext";
import { invested, marketValue, pnlPct, type CompanyProfile, type Holding } from "@/data/types";
import { pct } from "@/lib/format";
import { CompanyLogo } from "./CompanyLogo";

/** Portfolio as a grid of company cards: logo, what the company does, weight and returns. */
export function CompanyGrid({
  holdings,
  profiles,
  stats,
}: {
  holdings: Holding[];
  profiles: Map<string, CompanyProfile>;
  stats: Map<string, PositionStats>;
}) {
  const { base } = useRepo();
  const total = holdings.reduce((a, h) => a + (marketValue(h) ?? invested(h)), 0);
  const sorted = [...holdings].sort(
    (a, b) => (marketValue(b) ?? invested(b)) - (marketValue(a) ?? invested(a)),
  );

  return (
    <ul className="grid overflow-hidden rounded-sm border-t border-l border-line sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((h) => {
        const p = profiles.get(h.symbol);
        const s = stats.get(h.symbol);
        const name = p?.name ?? h.name ?? h.symbol;
        const weight = ((marketValue(h) ?? invested(h)) / total) * 100;
        return (
          <li key={h.id} className="border-r border-b border-line bg-surface">
            <Link
              to={`${base}/holding/${encodeURIComponent(h.symbol)}`}
              className="group flex h-full flex-col p-5 transition-colors hover:bg-paper-2/60 sm:p-6"
            >
              <div className="flex items-start gap-4">
                <CompanyLogo name={name} website={p?.website} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-[17px] font-semibold tracking-tight">{name}</h3>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-ink"
                      aria-hidden
                    />
                  </div>
                  <p className="text-[13px] text-ink-3">
                    {h.source === "kite_mf"
                      ? (p?.sector ?? "Mutual fund")
                      : [h.symbol, p?.sector].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 min-h-[2.6em] text-[14px] leading-snug text-ink-2">
                {p?.oneLiner ?? (
                  <span className="text-ink-3">Not researched yet. Open to add a profile.</span>
                )}
              </p>
              <dl className="tabular mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-[13px]">
                <div>
                  <dt className="text-ink-3">Weight</dt>
                  <dd className="mt-0.5 font-medium">{pct(weight, 1, false)}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Return</dt>
                  <dd className="mt-0.5 font-medium">
                    <Delta value={pnlPct(h)}>{pct(pnlPct(h), 1)}</Delta>
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">XIRR</dt>
                  <dd className="mt-0.5 font-medium">
                    {s?.xirr != null ? (
                      <Delta value={s.xirr}>{pct(s.xirr * 100, 1)}</Delta>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
