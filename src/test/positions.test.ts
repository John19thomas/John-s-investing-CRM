import { describe, expect, it } from "vitest";
import { bookXirr, missingLot, statsBySymbol } from "@/components/holdings/positions";
import type { Holding, Txn } from "@/data/types";

const h = (symbol: string, quantity: number, avgPrice: number, lastPrice: number): Holding => ({
  id: symbol,
  source: "kite",
  symbol,
  name: symbol,
  exchange: "NSE",
  quantity,
  avgPrice,
  lastPrice,
  dayChangePct: 0,
  currency: "INR",
  snapshotAt: "2026-01-01T00:00:00Z",
});
const buy = (
  symbol: string,
  date: string,
  quantity: number,
  price: number,
  estimated = false,
): Txn => ({
  source: "kite",
  symbol,
  date,
  side: "buy",
  quantity,
  price,
  amount: null,
  currency: "INR",
  estimated,
});

describe("blended XIRR and missing lots", () => {
  const holdings = [h("AAA", 100, 100, 150), h("BBB", 50, 200, 220)];

  it("covers only holdings with complete history and reports coverage", () => {
    const txns = [buy("AAA", "2024-01-01", 100, 100)];
    const stats = statsBySymbol(holdings, txns);
    const b = bookXirr(holdings, txns, stats);
    expect(b.covered).toBe(1);
    expect(b.total).toBe(2);
    expect(b.xirr).toBeGreaterThan(0);
    expect(Math.round(b.coveredValuePct)).toBe(58); // 15,000 of 26,000
  });

  it("derives the missing lot so total cost matches the broker average", () => {
    const txns = [buy("BBB", "2025-06-01", 20, 230)];
    const lot = missingLot(holdings[1]!, statsBySymbol(holdings, txns).get("BBB"));
    expect(lot?.quantity).toBe(30);
    // 50 × 200 = 10,000 total cost; 20 × 230 = 4,600 already explained.
    expect(lot?.price).toBeCloseTo(5400 / 30);
  });

  it("an opening lot completes the book and is counted as estimated", () => {
    const txns = [buy("AAA", "2024-01-01", 100, 100), buy("BBB", "2024-06-01", 50, 200, true)];
    const b = bookXirr(holdings, txns, statsBySymbol(holdings, txns));
    expect(b.covered).toBe(2);
    expect(b.estimated).toBe(1);
    expect(b.xirr).not.toBeNull();
    expect(missingLot(holdings[1]!, statsBySymbol(holdings, txns).get("BBB"))).toBeNull();
  });
});
