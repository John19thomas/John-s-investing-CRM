// Market prices for holdings, from free sources.
//  - US listings: Finnhub (/quote, free key, 60 calls/min) when FINNHUB_API_KEY is set,
//    otherwise Yahoo Finance's public chart endpoint (no key, unofficial).
//  - Indian listings: Yahoo Finance (SYMBOL.NS for NSE, SYMBOL.BO for BSE).
// Pure fetch + maths; the caller decides which rows to update.

export type Quote = {
  price: number;
  prevClose: number | null;
  at: string;
  source: "finnhub" | "yahoo";
};

export type QuoteRow = {
  id: string;
  source: string;
  symbol: string;
  exchange: string | null;
  quantity: number;
  avg_price: number | null;
};

/** Yahoo ticker for a holding: BRK.B -> BRK-B; NSE -> .NS; BSE -> .BO. */
export function yahooTicker(row: Pick<QuoteRow, "source" | "symbol" | "exchange">): string {
  const s = row.symbol.trim().toUpperCase();
  if (row.source === "kite") return `${s}.${row.exchange === "BSE" ? "BO" : "NS"}`;
  return s.replace(/\./g, "-");
}

const UA = "Mozilla/5.0 (compatible; investing-dashboard/1.0)";

async function yahoo(ticker: string): Promise<Quote | null> {
  for (const host of ["query1", "query2"]) {
    try {
      const r = await fetch(
        `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
      );
      if (!r.ok) continue;
      const j = await r.json();
      const m = j?.chart?.result?.[0]?.meta;
      const price = Number(m?.regularMarketPrice);
      if (!Number.isFinite(price) || price <= 0) continue;
      // Previous session's close: the second-to-last daily close in the 5-day window.
      const closes: (number | null)[] = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const valid = closes.filter((c): c is number => typeof c === "number" && c > 0);
      const prev =
        Number(m?.previousClose) ||
        (valid.length >= 2 ? valid[valid.length - 2]! : Number(m?.chartPreviousClose) || null);
      const t = Number(m?.regularMarketTime);
      return {
        price,
        prevClose: prev && Number.isFinite(prev) ? prev : null,
        at:
          Number.isFinite(t) && t > 0 ? new Date(t * 1000).toISOString() : new Date().toISOString(),
        source: "yahoo",
      };
    } catch {
      /* try the next host */
    }
  }
  return null;
}

async function finnhub(symbol: string, key: string): Promise<Quote | null> {
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    const price = Number(j?.c);
    if (!Number.isFinite(price) || price <= 0) return null;
    const t = Number(j?.t);
    return {
      price,
      prevClose: Number(j?.pc) > 0 ? Number(j.pc) : null,
      at: t > 0 ? new Date(t * 1000).toISOString() : new Date().toISOString(),
      source: "finnhub",
    };
  } catch {
    return null;
  }
}

export async function quoteFor(
  row: Pick<QuoteRow, "source" | "symbol" | "exchange">,
  finnhubKey?: string | null,
): Promise<Quote | null> {
  if (row.source === "revolut" && finnhubKey) {
    const q = await finnhub(row.symbol.toUpperCase(), finnhubKey);
    if (q) return q;
  }
  return yahoo(yahooTicker(row));
}

/** USD -> INR, for combining the two books. */
export async function usdInr(): Promise<number | null> {
  const q = await yahoo("INR=X");
  return q?.price ?? null;
}

/** Run fn over items with at most `limit` in flight. */
export async function pool<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]!);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Column updates for a holding row given a fresh quote. */
export function priceUpdate(row: QuoteRow, q: Quote) {
  const qty = Number(row.quantity);
  const avg = Number(row.avg_price ?? 0);
  return {
    last_price: q.price,
    close_price: q.prevClose,
    day_change_pct: q.prevClose ? (q.price / q.prevClose - 1) * 100 : null,
    pnl: (q.price - avg) * qty,
    price_at: q.at,
    price_source: q.source,
  };
}
