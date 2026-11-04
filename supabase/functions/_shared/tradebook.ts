// Zerodha Console tradebook CSV -> trades.
// Console → Reports → Tradebook → choose segment (Equity / Mutual funds) and a date range → Download CSV.
// Expected columns (case/spacing insensitive): symbol, isin, trade_date, exchange, segment,
// series, trade_type, auction, quantity, price, trade_id, order_id, order_execution_time.
import { parseCsv } from "./revolut.ts";

export type TradebookRow = {
  symbol: string;
  isin: string | null;
  date: string; // YYYY-MM-DD
  side: "buy" | "sell";
  quantity: number;
  price: number;
  segment: string;
  tradeId: string;
};

export type TradebookResult = { trades: TradebookRow[]; skipped: number; symbols: string[] };

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/); // DD/MM/YYYY (Indian format)
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return null;
}

export function parseTradebook(text: string): TradebookResult {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("The file has no data rows.");
  const headers = rows[0]!.map(norm);
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headers.indexOf(norm(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  const c = {
    symbol: col("symbol", "tradingsymbol"),
    isin: col("isin"),
    date: col("trade_date", "date"),
    type: col("trade_type", "type"),
    qty: col("quantity", "qty"),
    price: col("price", "trade_price"),
    segment: col("segment"),
    id: col("trade_id"),
    order: col("order_id"),
    time: col("order_execution_time"),
  };
  const missing = Object.entries({
    symbol: c.symbol,
    trade_date: c.date,
    trade_type: c.type,
    quantity: c.qty,
    price: c.price,
  })
    .filter(([, i]) => i < 0)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `This doesn't look like a Zerodha tradebook. Missing column(s): ${missing.join(", ")}.`,
    );
  }

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const trades: TradebookRow[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const symbol = cell(r, c.symbol).toUpperCase();
    const date = toIsoDate(cell(r, c.date));
    const type = cell(r, c.type).toLowerCase();
    const quantity = Number(cell(r, c.qty).replace(/,/g, ""));
    const price = Number(cell(r, c.price).replace(/,/g, ""));
    if (
      !symbol ||
      !date ||
      !(type === "buy" || type === "sell") ||
      !(quantity > 0) ||
      !(price >= 0)
    ) {
      skipped++;
      continue;
    }
    const tradeId =
      cell(r, c.id) ||
      `${cell(r, c.order)}-${cell(r, c.time)}-${symbol}-${date}-${type}-${quantity}-${price}`;
    trades.push({
      symbol,
      isin: cell(r, c.isin) || null,
      date,
      side: type,
      quantity,
      price,
      segment: cell(r, c.segment).toUpperCase(),
      tradeId,
    });
  }
  return { trades, skipped, symbols: [...new Set(trades.map((t) => t.symbol))].sort() };
}
