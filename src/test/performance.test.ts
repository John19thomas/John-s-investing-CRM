import { formatHoldingPeriod, portfolioXirr, positionStats, xirr } from "@shared/performance";
import { parseTradebook } from "@shared/tradebook";
import { parseRevolutCsv } from "@shared/revolut";

describe("xirr", () => {
  it("matches a simple one-year return", () => {
    const r = xirr([
      { date: "2023-01-01", amount: -1000 },
      { date: "2024-01-01", amount: 1100 },
    ]);
    expect(r).toBeCloseTo(0.1, 3);
  });

  it("handles multiple irregular flows (Excel XIRR reference)", () => {
    // Excel: XIRR({-10000, 2750, 4250, 3250, 2750}, {1/1/08, 3/1/08, 10/30/08, 2/15/09, 4/1/09}) = 37.34%
    const r = xirr([
      { date: "2008-01-01", amount: -10000 },
      { date: "2008-03-01", amount: 2750 },
      { date: "2008-10-30", amount: 4250 },
      { date: "2009-02-15", amount: 3250 },
      { date: "2009-04-01", amount: 2750 },
    ]);
    expect(r).toBeCloseTo(0.3734, 3);
  });

  it("returns null without both inflows and outflows", () => {
    expect(xirr([{ date: "2024-01-01", amount: -100 }])).toBeNull();
  });
});

describe("positionStats", () => {
  it("uses FIFO lots for holding period and entry price", () => {
    const s = positionStats(
      [
        { date: "2022-01-01", side: "buy", quantity: 10, price: 100 },
        { date: "2023-01-01", side: "buy", quantity: 10, price: 200 },
        { date: "2023-06-01", side: "sell", quantity: 5, price: 250 },
      ],
      15,
      300,
      "2024-01-01",
    );
    expect(s.complete).toBe(true);
    expect(s.heldSince).toBe("2022-01-01"); // 5 shares of the first lot remain
    expect(s.fifoEntryPrice).toBeCloseTo((5 * 100 + 10 * 200) / 15, 6);
    expect(s.avgHoldingDays).toBeCloseTo((5 * 730 + 10 * 365) / 15, 0);
    expect(s.xirr).toBeGreaterThan(0.5);
  });

  it("scales lots on a split without resetting dates", () => {
    const s = positionStats(
      [
        { date: "2022-01-01", side: "buy", quantity: 1, price: 1000 },
        { date: "2023-01-01", side: "split", quantity: 9, price: 0 },
      ],
      10,
      120,
      "2024-01-01",
    );
    expect(s.complete).toBe(true);
    expect(s.heldSince).toBe("2022-01-01");
    expect(s.fifoEntryPrice).toBeCloseTo(100, 6);
    expect(s.xirr).toBeCloseTo(0.0954, 2); // 1000 → 1200 over two years
  });

  it("flags incomplete trade history and withholds XIRR", () => {
    const s = positionStats(
      [{ date: "2023-01-01", side: "buy", quantity: 5, price: 10 }],
      20,
      12,
      "2024-01-01",
    );
    expect(s.complete).toBe(false);
    expect(s.xirr).toBeNull();
  });

  it("combines positions into a portfolio XIRR", () => {
    const r = portfolioXirr(
      [{ trades: [{ date: "2023-01-01", side: "buy", quantity: 10, price: 100 }], value: 1100 }],
      "2024-01-01",
    );
    expect(r).toBeCloseTo(0.1, 3);
  });

  it("formats holding periods", () => {
    expect(formatHoldingPeriod(12)).toBe("12d");
    expect(formatHoldingPeriod(200)).toBe("6m");
    expect(formatHoldingPeriod(800)).toBe("2y 2m");
  });
});

describe("parseTradebook", () => {
  it("reads a Zerodha Console tradebook", () => {
    const r = parseTradebook(
      `symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time
RELIANCE,INE002A01018,2023-04-12,NSE,EQ,EQ,buy,false,10.000000,2350.50,111,9001,2023-04-12T10:01:02
RELIANCE,INE002A01018,15/06/2024,NSE,EQ,EQ,sell,false,2,2950,112,9002,2024-06-15T11:00:00
INFY,INE009A01021,2023-05-01,NSE,EQ,EQ,BUY,false,5,1300,113,9003,2023-05-01T09:30:00
,,,,,,,,,,,,`,
    );
    expect(r.trades).toHaveLength(3);
    expect(r.trades[1]).toMatchObject({
      symbol: "RELIANCE",
      date: "2024-06-15",
      side: "sell",
      quantity: 2,
    });
    expect(r.symbols).toEqual(["INFY", "RELIANCE"]);
  });

  it("explains which columns are missing", () => {
    expect(() => parseTradebook("a,b\n1,2")).toThrow(/Missing column/);
  });
});

describe("parseRevolutCsv trades", () => {
  it("keeps buys, sells, dividends and splits with dates", () => {
    const r =
      parseRevolutCsv(`Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate
2024-01-06T14:30:00.000Z,AAPL,BUY - MARKET,10,USD 100.00,USD 1000,USD,1.0
2024-03-07T14:30:00.000Z,AAPL,DIVIDEND,,,USD 3.20,USD,1.0
2024-06-10T14:30:00.000Z,AAPL,STOCK SPLIT,10,,USD 0,USD,1.0
2024-07-01T14:30:00.000Z,AAPL,SELL - MARKET,5,USD 60,USD 300,USD,1.0
`);
    expect(r.trades.map((t) => t.side)).toEqual(["buy", "dividend", "split", "sell"]);
    expect(r.trades[1]).toMatchObject({ amount: 3.2, date: "2024-03-07" });
    expect(r.positions[0]).toMatchObject({ symbol: "AAPL", quantity: 15 });
  });
});
