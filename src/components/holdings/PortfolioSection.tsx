import { LayoutGrid, Rows3, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SegmentedControl } from "@/components/app/primitives";
import { isRunning, useProfiles, useResearchCompany } from "@/data/hooks";
import type { CompanyProfile, Holding } from "@/data/types";
import type { PositionStats } from "@shared/performance";
import { CompanyGrid } from "./CompanyGrid";
import { HoldingsTable } from "./HoldingsTable";

const BATCH = 5;

/** Holdings as company cards (default) or a sortable table, with logos, XIRR and click-through. */
export function PortfolioSection({
  title,
  holdings,
  stats,
  showDay,
  controls,
  bookXirr,
  notice,
}: {
  title: string;
  holdings: Holding[];
  stats: Map<string, PositionStats>;
  showDay?: boolean;
  controls?: ReactNode;
  bookXirr?: number | null;
  notice?: ReactNode;
}) {
  const [view, setView] = useState<"companies" | "table">("table");
  const profiles = useProfiles();
  const research = useResearchCompany();
  const [starting, setStarting] = useState(false);

  const byS = useMemo(() => {
    const m = new Map<string, CompanyProfile>();
    for (const p of profiles.data ?? []) m.set(p.symbol, p);
    return m;
  }, [profiles.data]);

  const missing = holdings.filter((h) => {
    const p = byS.get(h.symbol);
    return !p || (p.researchStatus !== "done" && !isRunning(p.researchStatus, p.researchStartedAt));
  });
  const running = holdings.filter((h) => {
    const p = byS.get(h.symbol);
    return p && isRunning(p.researchStatus, p.researchStartedAt);
  }).length;

  const researchMissing = async () => {
    setStarting(true);
    const batch = missing.slice(0, BATCH);
    for (const h of batch) {
      try {
        await research.mutateAsync({ symbol: h.symbol, name: h.name, exchange: h.exchange });
      } catch (e) {
        toast.error(`Couldn't start research for ${h.symbol}`, {
          description: (e as Error).message,
        });
        break;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setStarting(false);
    toast.message(`Researching ${batch.length} companies`, {
      description: "Logos and descriptions appear as each one finishes (1–3 minutes).",
    });
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {holdings.length} holdings
            {running > 0 && ` · researching ${running}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {controls}
          {missing.length > 0 && (
            <button
              type="button"
              onClick={researchMissing}
              disabled={starting}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 underline decoration-line underline-offset-4 hover:text-ink disabled:opacity-50"
            >
              <Sparkles className="size-3.5" aria-hidden />
              {starting
                ? "Starting…"
                : `Research ${Math.min(missing.length, BATCH)} of ${missing.length} unresearched`}
            </button>
          )}
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              {
                value: "table",
                label: (
                  <span className="flex items-center gap-1.5">
                    <Rows3 className="size-3.5" aria-hidden /> Table
                  </span>
                ),
              },
              {
                value: "companies",
                label: (
                  <span className="flex items-center gap-1.5">
                    <LayoutGrid className="size-3.5" aria-hidden /> Companies
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
      {notice}
      {view === "companies" ? (
        <CompanyGrid holdings={holdings} profiles={byS} stats={stats} />
      ) : (
        <div className="overflow-hidden rounded-sm border border-line bg-surface">
          <HoldingsTable
            holdings={holdings}
            showDay={showDay ?? true}
            profiles={byS}
            stats={stats}
            bookXirr={bookXirr ?? null}
          />
        </div>
      )}
    </section>
  );
}
