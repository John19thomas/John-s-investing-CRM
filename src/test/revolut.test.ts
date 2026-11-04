import { parseMoney, parseRevolutCsv } from "@shared/revolut";

const STATEMENT = `Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate
2024-01-05T14:30:00.000Z,,CASH TOP-UP,,,USD 1000,USD,1.0
2024-01-06T14:30:00.000Z,AAPL,BUY - MARKET,10,USD 100.00,USD 1000,USD,1.0
2024-02-06T14:30:00.000Z,AAPL,BUY - LIMIT,10,USD 200.00,USD 2000,USD,1.0
2024-03-06T14:30:00.000Z,AAPL,SELL - MARKET,5,USD 250.00,USD 1250,USD,1.0
2024-03-07T14:30:00.000Z,AAPL,DIVIDEND,,,USD 3.20,USD,1.0
2024-03-01T14:30:00.000Z,TSLA,BUY - MARKET,2,"$1,000.50",USD 2001,USD,1.0
2024-04-01T14:30:00.000Z,TSLA,SELL - MARKET,2,USD 900,USD 1800,USD,1.0
2024-05-01T14:30:00.000Z,NVDA,BUY - MARKET,1,USD 1000,USD 1000,USD,1.0
2024-06-10T14:30:00.000Z,NVDA,STOCK SPLIT,9,,USD 0,USD,1.0
`;

describe("parseRevolutCsv", () => {
  it("rebuilds positions from a trading statement using average cost", () => {
    const r = parseRevolutCsv(STATEMENT);
    expect(r.format).toBe("transactions");
    expect(r.positions.map((p) => p.symbol)).toEqual(["AAPL", "NVDA"]); // TSLA fully sold
    expect(r.positions[0]).toMatchObject({ quantity: 15, avg_price: 150, currency: "USD" });
    expect(r.positions[1]).toMatchObject({ quantity: 10, avg_price: 100 }); // split keeps cost
    expect(r.warnings).toEqual([]);
  });

  it("reads a holdings snapshot, merges duplicates and handles quotes, BOM and CRLF", () => {
    const r = parseRevolutCsv(
      `\uFEFFSymbol,Name,Shares,Average price,Current price,Currency\r\nmsft,"Microsoft, Inc",3,"$300.00",410.1,\r\nMSFT,Microsoft,1,400,410.1,USD\r\n`,
    );
    expect(r.format).toBe("holdings");
    expect(r.positions).toHaveLength(1);
    expect(r.positions[0]).toMatchObject({
      symbol: "MSFT",
      quantity: 4,
      avg_price: 325,
      name: "Microsoft, Inc",
      last_price: 410.1,
    });
  });

  it("warns when a statement sells more than it bought", () => {
    const r = parseRevolutCsv(
      `Date,Ticker,Type,Quantity,Price per share,Currency\n2024-01-01,AMD,BUY - MARKET,1,USD 100,USD\n2024-02-01,AMD,SELL - MARKET,3,USD 120,USD\n`,
    );
    expect(r.positions).toEqual([]);
    expect(r.warnings[0]).toMatch(/sells more shares/);
  });

  it("rejects files it can't understand with a helpful message", () => {
    expect(() => parseRevolutCsv("a,b\n1,2")).toThrow(/Ticker\/Symbol/);
    expect(() => parseRevolutCsv("Ticker,Quantity\nAAPL,1")).toThrow(/Average price/);
  });
});

describe("parseMoney", () => {
  it("handles currency codes, symbols and thousands separators", () => {
    expect(parseMoney("EUR 12.5")).toEqual({ value: 12.5, currency: "EUR" });
    expect(parseMoney("$1,234.50")).toEqual({ value: 1234.5, currency: "USD" });
    expect(parseMoney("")).toEqual({ value: null, currency: null });
  });
});
