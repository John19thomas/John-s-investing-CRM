import { formatDistanceToNowStrict } from "date-fns";
import { useLiveQuotes } from "@/data/hooks";
import type { Holding, PortfolioScope } from "@/data/types";

const SOURCE: Record<string, string> = {
  yahoo: "Yahoo Finance",
  finnhub: "Finnhub",
  kite: "Kite",
};

/** "Live" indicator: refreshes prices every minute and shows when the latest quote is from. */
export function LiveBadge({ scope, holdings }: { scope: PortfolioScope; holdings: Holding[] }) {
  const q = useLiveQuotes(scope);
  const latest = holdings
    .map((h) => h.priceAt)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);
  const source = holdings.find((h) => h.priceAt === latest)?.priceSource;
  // Quotes older than 20 minutes mean the market is closed (or the source is lagging).
  const fresh = latest ? Date.now() - new Date(latest).getTime() < 20 * 60_000 : false;

  if (!latest && !q.isFetching) return null;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-2"
      title={q.data?.failed.length ? `No quote for ${q.data.failed.join(", ")}` : undefined}
    >
      <span className="relative flex size-2">
        {fresh && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-gain opacity-60" />
        )}
        <span
          className={`relative inline-flex size-2 rounded-full ${fresh ? "bg-gain" : "bg-ink-3"}`}
        />
      </span>
      {q.isFetching && !latest
        ? "Fetching prices…"
        : `${fresh ? "Live" : "Last close"} · ${formatDistanceToNowStrict(new Date(latest!), { addSuffix: true })}${source ? ` · ${SOURCE[source] ?? source}` : ""}`}
    </span>
  );
}
