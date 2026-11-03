// Revolut stock CSV -> current positions.
// Pure TypeScript (no Deno / Node imports) so it can run in an edge function and be unit-tested.
//
// Two export formats are understood:
//  1. Trading account statement (transactions), e.g.
//     Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate
//     Positions are rebuilt from BUY / SELL / STOCK SPLIT rows using average cost.
//  2. A holdings snapshot, i.e. any CSV with a ticker/symbol column, a quantity/shares
//     column and an average-price column (optionally currency, name and current price).

export type RevolutPosition = {
  symbol: string;
  name: string | null;
  quantity: number;
  avg_price: number;
  last_price: number | null;
  currency: string;
};

export type RevolutParseResult = {
  format: "transactions" | "holdings";
  positions: RevolutPosition[];
  warnings: string[];
  rows_read: number;
};

const EPSILON = 1e-9;

/** Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes, commas/newlines in quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const CURRENCY_SYMBOLS: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "₹": "INR" };

/** Parses "USD 1,234.56", "$1,234.56", "-12.5", "1 234,56"? (comma decimals not supported). */
export function parseMoney(raw: string | undefined): { value: number | null; currency: string | null } {
  if (raw == null) return { value: null, currency: null };
  let s = raw.trim();
  if (!s) return { value: null, currency: null };
  let currency: string | null = null;
  const code = s.match(/^([A-Z]{3})\s*/) ?? s.match(/\s*([A-Z]{3})$/);
  if (code) {
    currency = code[1] ?? null;
    s = s.replace(code[0], "");
  }
  const sym = s.match(/[$€£₹]/);
  if (sym) {
    currency = currency ?? CURRENCY_SYMBOLS[sym[0]] ?? null;
    s = s.replace(sym[0], "");
  }
  s = s.replace(/,/g, "").replace(/\s/g, "");
  const value = s === "" ? null : Number(s);
  return { value: value != null && Number.isFinite(value) ? value : null, currency };
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

function findCol(headers: string[], candidates: string[]): number {
  const normed = headers.map(norm);
  for (const c of candidates) {
    const i = normed.indexOf(norm(c));
    if (i >= 0) return i;
  }
  return -1;
}

export function parseRevolutCsv(text: string): RevolutParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("The file has no data rows.");
  const headers = rows[0]!.map((h) => h.trim());
  const body = rows.slice(1);

  const col = {
    ticker: findCol(headers, ["Ticker", "Symbol", "Instrument"]),
    type: findCol(headers, ["Type", "Transaction type"]),
    qty: findCol(headers, ["Quantity", "Shares", "Qty"]),
    price: findCol(headers, ["Price per share", "Price"]),
    avg: findCol(headers, ["Average price", "Avg price", "Average cost", "Avg cost", "Cost per share"]),
    last: findCol(headers, ["Current price", "Last price", "Market price"]),
    currency: findCol(headers, ["Currency", "Ccy"]),
    name: findCol(headers, ["Name", "Company", "Instrument name"]),
    date: findCol(headers, ["Date", "Time", "Completed Date"]),
  };
  if (col.ticker < 0) throw new Error(`Couldn't find a Ticker/Symbol column. Columns found: ${headers.join(", ")}`);
  if (col.qty < 0) throw new Error(`Couldn't find a Quantity/Shares column. Columns found: ${headers.join(", ")}`);

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const warnings: string[] = [];

  const looksLikeTransactions =
    col.type >= 0 && col.price >= 0 && body.some((r) => /^(BUY|SELL)/i.test(cell(r, col.type)));

  if (looksLikeTransactions) {
    // ---- Transactions statement ----
    type Pos = { qty: number; cost: number; currency: string };
    const book = new Map<string, Pos>();
    const ordered = body
      .map((r, idx) => ({ r, idx, t: Date.parse(cell(r, col.date)) }))
      .sort((a, b) => (Number.isNaN(a.t) || Number.isNaN(b.t) ? a.idx - b.idx : a.t - b.t || a.idx - b.idx));

    for (const { r, idx } of ordered) {
      const ticker = cell(r, col.ticker).toUpperCase();
      const type = cell(r, col.type).toUpperCase();
      if (!ticker) continue; // cash top-ups, withdrawals, fees without a ticker
      const qty = parseMoney(cell(r, col.qty)).value;
      const price = parseMoney(cell(r, col.price));
      const currency = cell(r, col.currency).toUpperCase() || price.currency || "USD";
      const pos = book.get(ticker) ?? { qty: 0, cost: 0, currency };
      pos.currency = currency;

      if (type.startsWith("BUY")) {
        if (qty == null || price.value == null) {
          warnings.push(`Row ${idx + 2}: skipped ${ticker} buy with missing quantity or price.`);
          continue;
        }
        pos.qty += Math.abs(qty);
        pos.cost += Math.abs(qty) * price.value;
      } else if (type.startsWith("SELL")) {
        if (qty == null) {
          warnings.push(`Row ${idx + 2}: skipped ${ticker} sell with missing quantity.`);
          continue;
        }
        const q = Math.min(Math.abs(qty), pos.qty);
        if (Math.abs(qty) - pos.qty > 1e-6)
          warnings.push(`Row ${idx + 2}: ${ticker} sells more shares than were bought in this file (statement may be partial).`);
        const avg = pos.qty > EPSILON ? pos.cost / pos.qty : 0;
        pos.qty -= q;
        pos.cost -= avg * q;
      } else if (type.includes("SPLIT")) {
        // Revolut books a split as a quantity adjustment with no cash amount.
        if (qty != null) pos.qty += qty;
      } else {
        continue; // DIVIDEND, CUSTODY FEE, etc. don't change the position
      }
      book.set(ticker, pos);
    }

    const positions: RevolutPosition[] = [...book.entries()]
      .filter(([, p]) => p.qty > EPSILON)
      .map(([symbol, p]) => ({
        symbol,
        name: null,
        quantity: round(p.qty, 8),
        avg_price: round(Math.max(p.cost, 0) / p.qty, 6),
        last_price: null,
        currency: p.currency,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
    return { format: "transactions", positions, warnings, rows_read: body.length };
  }

  // ---- Holdings snapshot ----
  if (col.avg < 0) {
    throw new Error(
      "This doesn't look like a Revolut trading statement (needs Type and Price per share columns) " +
        "or a holdings file (needs an Average price column).",
    );
  }
  const merged = new Map<string, RevolutPosition>();
  body.forEach((r, idx) => {
    const symbol = cell(r, col.ticker).toUpperCase();
    const qty = parseMoney(cell(r, col.qty)).value;
    const avg = parseMoney(cell(r, col.avg));
    if (!symbol) return;
    if (qty == null || avg.value == null) {
      warnings.push(`Row ${idx + 2}: skipped ${symbol} with missing quantity or average price.`);
      return;
    }
    if (qty <= EPSILON) return;
    const last = parseMoney(cell(r, col.last));
    const currency = cell(r, col.currency).toUpperCase() || avg.currency || last.currency || "USD";
    const prev = merged.get(symbol);
    if (prev) {
      const totalQty = prev.quantity + qty;
      prev.avg_price = round((prev.avg_price * prev.quantity + avg.value * qty) / totalQty, 6);
      prev.quantity = round(totalQty, 8);
    } else {
      merged.set(symbol, {
        symbol,
        name: cell(r, col.name) || null,
        quantity: round(qty, 8),
        avg_price: round(avg.value, 6),
        last_price: last.value,
        currency,
      });
    }
  });
  const positions = [...merged.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  return { format: "holdings", positions, warnings, rows_read: body.length };
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
