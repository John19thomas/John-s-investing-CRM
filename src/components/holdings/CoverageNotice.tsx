import type { PositionStats } from "@shared/performance";
import { format, parseISO } from "date-fns";
import { Info } from "lucide-react";
import type { Holding, Txn } from "@/data/types";
import { xirrInfo } from "./positions";

/** Explains how many holdings have XIRR and what is missing for the rest. */
export function CoverageNotice({
  holdings,
  txns,
  stats,
  hint,
  onImport,
  importLabel,
  onDates,
}: {
  holdings: Holding[];
  txns: Txn[];
  stats: Map<string, PositionStats>;
  hint: string;
  onImport?: () => void;
  importLabel?: string;
  onDates?: () => void;
}) {
  if (!holdings.length) return null;
  const infos = holdings.map((h) => xirrInfo(stats.get(h.symbol), h.quantity));
  const withXirr = infos.filter((i) => i.value != null).length;
  if (withXirr === holdings.length) return null;
  const none = infos.filter((i) => i.note === "No trade history").length;
  const partial = infos.filter((i) => i.note.startsWith("Partial")).length;
  const recent = infos.filter((i) => i.note === "Held < 30 days").length;
  const dates = txns.map((t) => t.date).sort();
  const range =
    dates.length > 0
      ? `${format(parseISO(dates[0]!), "MMM yyyy")} – ${format(parseISO(dates.at(-1)!), "MMM yyyy")}`
      : null;

  return (
    <div className="mb-4 flex flex-col gap-3 border-l-2 border-ink bg-paper-2 px-4 py-3 text-[14px] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-2" aria-hidden />
        <p className="text-ink-2">
          <span className="font-medium text-ink">
            XIRR for {withXirr} of {holdings.length} holdings.
          </span>{" "}
          {range ? `Your trade history covers ${range}. ` : "No trade history imported yet. "}
          {[
            none ? `${none} with no trades in it` : null,
            partial ? `${partial} partly bought earlier` : null,
            recent ? `${recent} held under 30 days` : null,
          ]
            .filter(Boolean)
            .join(", ")}
          {none || partial
            ? `. Enter a purchase date for those to get an estimate, or: ${hint}`
            : "."}
        </p>
      </div>
      {(none > 0 || partial > 0) && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {onDates && (
            <button
              type="button"
              onClick={onDates}
              className="rounded-sm bg-ink px-3.5 py-2 text-[13px] font-medium text-paper hover:opacity-85"
            >
              Enter purchase dates
            </button>
          )}
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              className="rounded-sm border border-white/25 px-3.5 py-2 text-[13px] font-medium hover:border-white/60"
            >
              {importLabel ?? "Import trades"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
