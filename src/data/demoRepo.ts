// Demo mode: a realistic, entirely illustrative portfolio held in memory so the dashboard can
// be shared publicly without exposing real holdings. Private companies are fictional.
import { parseRevolutCsv } from "@shared/revolut";
import { demoFinancials, demoProfile, demoTrades } from "./demoResearch";
import type {
  Company,
  CompanyDocument,
  CompanyProfile,
  Holding,
  Note,
  Region,
  Repo,
  Snapshot,
  Txn,
} from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString();

// Deterministic pseudo-random so the demo looks the same on every load.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

type Seed = [symbol: string, name: string, qty: number, avg: number, last: number, day: number];

const INDIA_EQ: Seed[] = [
  ["RELIANCE", "Reliance Industries", 120, 2410.5, 2932.4, 0.84],
  ["HDFCBANK", "HDFC Bank", 180, 1512.2, 1698.75, -0.42],
  ["INFY", "Infosys", 150, 1385.0, 1872.3, 1.12],
  ["TCS", "Tata Consultancy Services", 40, 3290.0, 4105.6, 0.37],
  ["ICICIBANK", "ICICI Bank", 210, 905.4, 1268.9, 0.95],
  ["BHARTIARTL", "Bharti Airtel", 95, 812.0, 1642.1, 1.68],
  ["LT", "Larsen & Toubro", 45, 2210.0, 3548.2, -0.61],
  ["TITAN", "Titan Company", 60, 2650.0, 3388.0, -1.24],
  ["ASIANPAINT", "Asian Paints", 55, 3120.0, 2464.5, -0.88],
  ["BAJFINANCE", "Bajaj Finance", 28, 6890.0, 7215.4, 2.05],
  ["ITC", "ITC", 400, 342.6, 468.15, 0.21],
];
const INDIA_MF: Seed[] = [
  ["PPFAS-FLEXI", "Parag Parikh Flexi Cap Fund", 1850.42, 52.1, 84.36, 0.0],
  ["AXIS-SMALLCAP", "Axis Small Cap Fund", 2210.8, 61.4, 102.9, 0.0],
  ["UTI-NIFTY50", "UTI Nifty 50 Index Fund", 3120.15, 118.2, 162.4, 0.0],
];
const REVOLUT: Seed[] = [
  ["NVDA", "NVIDIA", 42, 48.2, 138.6, 0],
  ["MSFT", "Microsoft", 18, 289.4, 428.1, 0],
  ["AAPL", "Apple", 25, 158.7, 226.4, 0],
  ["GOOGL", "Alphabet", 30, 112.5, 171.2, 0],
  ["AMZN", "Amazon", 28, 128.9, 197.3, 0],
  ["ASML", "ASML Holding", 6, 642.0, 702.5, 0],
  ["TSM", "Taiwan Semiconductor", 22, 98.4, 189.7, 0],
  ["META", "Meta Platforms", 9, 312.0, 579.8, 0],
  ["VOO", "Vanguard S&P 500 ETF", 14, 398.2, 529.6, 0],
];

function seedHoldings(
  seeds: Seed[],
  source: Holding["source"],
  currency: string,
  exchange: string,
): Holding[] {
  return seeds.map(([symbol, name, quantity, avgPrice, lastPrice, dayChangePct]) => ({
    id: uid(),
    source,
    symbol,
    name,
    exchange,
    quantity,
    avgPrice,
    lastPrice,
    dayChangePct: source === "kite" ? dayChangePct : null,
    currency,
    snapshotAt: daysAgo(0.02),
  }));
}

function seedSnapshots(holdings: Holding[], scope: string, days: number, seed: number): Snapshot[] {
  const r = rng(seed);
  const invested = holdings.reduce((a, h) => a + h.quantity * h.avgPrice, 0);
  const current = holdings.reduce((a, h) => a + h.quantity * (h.lastPrice ?? h.avgPrice), 0);
  const out: Snapshot[] = [];
  // Walk backwards from today's value with a gentle drift and noise.
  let v = current;
  let inv = invested;
  for (let d = 0; d < days; d++) {
    const date = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
    out.push({
      date,
      source: scope,
      invested: inv,
      current: v,
      currency: holdings[0]?.currency ?? "INR",
    });
    v = v / (1 + 0.0009 + (r() - 0.5) * 0.022);
    if (d % 30 === 29) inv = inv * 0.965; // periodic top-ups
  }
  return out.reverse();
}

const COMPANIES: Company[] = [
  {
    id: "c1",
    name: "Northwind Robotics",
    website: "northwind.example",
    sector: "Industrial automation",
    stage: "Series A",
    round: "$18M Series A",
    status: "invested",
    region: "global",
    thesis:
      "Vision-guided picking arms that retrofit onto existing warehouse conveyors, sold to the mid-size 3PLs the incumbents ignore.\n\nWhy it matters: Mid-size warehouses cannot justify a full automation rebuild. A retrofit with payback under 9 months turns automation into an operating decision rather than a capital project.\n\nWhy now: Vision models are now good enough to pick mixed items without custom programming for each SKU.\n\nWhat has to go right: Hardware gross margin has to rise above 45% and the sales cycle has to shorten as reference customers accumulate.",
    keyRisks:
      "• Hardware gross margins below 45%\n• Long enterprise sales cycles\n• Dependency on a single gripper supplier",
    keyMetrics: {
      ARR: "USD 6.2m (Q2 2026)",
      "Net revenue retention": "138%",
      "Gross margin": "41% (FY25)",
    },
    lastValuation: 92_000_000,
    valuationCurrency: "USD",
    investedAmount: 50_000,
    updatedAt: daysAgo(2),
  },
  {
    id: "c2",
    name: "Lumen Bio",
    website: "lumenbio.example",
    sector: "Techbio",
    stage: "Seed",
    round: "$6M Seed",
    status: "watching",
    region: "global",
    thesis:
      "ML-designed enzymes for low-temperature industrial processes; first paid pilot with a top-5 detergent maker.",
    keyRisks: "• Scale-up from lab to fermentation\n• Pilot-to-contract conversion unproven",
    keyMetrics: { "Pilot revenue": "USD 0.4m (FY25)", Runway: "26 months" },
    lastValuation: 30_000_000,
    valuationCurrency: "USD",
    investedAmount: null,
    updatedAt: daysAgo(5),
  },
  {
    id: "c3",
    name: "Ledgerline",
    website: "ledgerline.example",
    sector: "Fintech infrastructure",
    stage: "Series B",
    round: "$40M Series B",
    status: "watching",
    region: "global",
    thesis:
      "Reconciliation APIs for marketplaces; usage-based pricing compounding with customer GMV.",
    keyRisks: "• Crowded category\n• Customer concentration (top 3 = 44% of revenue)",
    keyMetrics: {},
    lastValuation: 310_000_000,
    valuationCurrency: "USD",
    investedAmount: null,
    updatedAt: daysAgo(9),
  },
  {
    id: "c4",
    name: "Quanta Grid",
    website: null,
    sector: "Climate / energy storage",
    stage: "Series A",
    round: null,
    status: "watching",
    region: "global",
    thesis: "Grid-scale iron-air storage.",
    keyRisks: "• Capital intensity too high for the stage\n• Technology risk on cycle life",
    keyMetrics: {},
    lastValuation: null,
    valuationCurrency: "USD",
    investedAmount: null,
    updatedAt: daysAgo(30),
  },
  {
    id: "c5",
    name: "Kirana Cloud",
    website: "kiranacloud.example",
    sector: "Retail SaaS",
    stage: "Series A",
    round: "₹120Cr Series A",
    status: "invested",
    region: "india",
    thesis:
      "Inventory and credit OS for neighbourhood stores, monetised through embedded working-capital loans with NBFC partners.",
    keyRisks: "• Credit losses through a downturn\n• RBI digital-lending rule changes",
    keyMetrics: {
      "Monthly GMV": "INR 410Cr (Sep 2026)",
      "Active stores": "86,000",
      "Take rate": "1.1%",
    },
    lastValuation: 9_000_000_000,
    valuationCurrency: "INR",
    investedAmount: 2_500_000,
    updatedAt: daysAgo(1),
  },
  {
    id: "c6",
    name: "Saathi Health",
    website: "saathi.example",
    sector: "Healthtech",
    stage: "Seed",
    round: "₹25Cr Seed",
    status: "watching",
    region: "india",
    thesis: "Vernacular tele-consults bundled with diagnostics for tier-2/3 cities.",
    keyRisks: "• Low willingness to pay\n• Doctor supply in regional languages",
    keyMetrics: { "Monthly consults": "48,000 (Aug 2026)" },
    lastValuation: 1_400_000_000,
    valuationCurrency: "INR",
    investedAmount: null,
    updatedAt: daysAgo(4),
  },
  {
    id: "c7",
    name: "Monsoon Mobility",
    website: null,
    sector: "EV / logistics",
    stage: "Pre-seed",
    round: null,
    status: "watching",
    region: "india",
    thesis: "Battery-swapping network for last-mile cargo three-wheelers.",
    keyRisks: "• Unit economics depend on swap density",
    keyMetrics: {},
    lastValuation: null,
    valuationCurrency: "INR",
    investedAmount: null,
    updatedAt: daysAgo(12),
  },
];

const NOTES: Note[] = [
  {
    id: "n1",
    companyId: "c1",
    body: "Call with CEO: two new 3PL logos signed in Q3, pipeline 3x last quarter. Asked about the gripper supplier risk; they're qualifying a second vendor by Q1.",
    createdAt: daysAgo(2),
  },
  {
    id: "n2",
    companyId: "c1",
    body: "Reference call with an ops director at a customer: install took 6 days, picks/hour up 2.4x. Would expand to 3 more sites.",
    createdAt: daysAgo(16),
  },
  {
    id: "n3",
    companyId: "c5",
    body: "Board update: GMV +18% q/q, credit book NPAs at 1.9%. Considering pro-rata in the bridge.",
    createdAt: daysAgo(1),
  },
];

const DOCS: CompanyDocument[] = [
  {
    id: "d1",
    companyId: "c1",
    title: "Northwind Robotics — IC memo",
    docType: "memo",
    storagePath: "demo",
    summary:
      "Recommends a USD 50k allocation in the Series A. The memo argues Northwind wins mid-size 3PLs on payback period (<9 months) while incumbents focus on large DCs. Main debate is hardware margins, expected to reach 50% with the v3 arm.",
    keyTakeaways:
      "• ARR USD 6.2m (Q2 2026), NRR 138%\n• Payback <9 months for customers\n• Gross margin 41% (FY25), target 50%\n• Second gripper supplier by Q1 2027\n• Pricing power from retrofit, not greenfield",
    uploadedAt: daysAgo(20),
    externalUrl: null,
    mimeType: "application/pdf",
  },
];

export function createDemoRepo(): Repo {
  const holdings = {
    india: [...seedHoldings(INDIA_EQ, "kite", "INR", "NSE")],
    revolut: seedHoldings(REVOLUT, "revolut", "USD", "US"),
  };
  const snapshots = {
    india: seedSnapshots(holdings.india, "india", 180, 7),
    revolut: seedSnapshots(holdings.revolut, "revolut", 180, 11),
  };
  let companies = structuredClone(COMPANIES);
  let notes = structuredClone(NOTES);
  let docs = structuredClone(DOCS);
  const files = new Map<string, string>();

  const MEMO_FOR = new Set(["RELIANCE", "INFY", "NVDA", "MSFT"]);
  const profiles = new Map<string, CompanyProfile>();
  for (const h of [...holdings.india, ...holdings.revolut])
    profiles.set(h.symbol, demoProfile(h, MEMO_FOR.has(h.symbol)));
  // Two holdings have no trade history, to show how missing purchase dates are handled.
  const NO_HISTORY = new Set(["ASIANPAINT", "ITC"]);
  let trades: Txn[] = [...demoTrades(holdings.india), ...demoTrades(holdings.revolut)].filter(
    (t) => !NO_HISTORY.has(t.symbol),
  );
  const findHolding = (symbol: string) =>
    [...holdings.india, ...holdings.revolut].find((h) => h.symbol === symbol);

  return {
    mode: "demo",
    async holdings(scope) {
      await wait(250);
      return structuredClone(holdings[scope]);
    },
    async snapshots(scope) {
      await wait(250);
      return structuredClone(snapshots[scope]);
    },
    async syncKite() {
      await wait(1100);
      const r = rng(Date.now() % 100000);
      for (const h of holdings.india) {
        if (h.lastPrice == null) continue;
        const move = (r() - 0.48) * 0.012;
        h.lastPrice = +(h.lastPrice * (1 + move)).toFixed(2);
        if (h.source === "kite") h.dayChangePct = +((h.dayChangePct ?? 0) + move * 100).toFixed(2);
        h.snapshotAt = new Date().toISOString();
      }
      const last = snapshots.india.at(-1);
      if (last)
        last.current = holdings.india.reduce(
          (a, h) => a + h.quantity * (h.lastPrice ?? h.avgPrice),
          0,
        );
      return {
        status: "ok",
        equityCount: INDIA_EQ.length,
        mfCount: 0,
        syncedAt: new Date().toISOString(),
      };
    },
    async previewRevolut(csv) {
      await wait(200);
      return parseRevolutCsv(csv);
    },
    async commitRevolut(csv) {
      await wait(500);
      const parsed = parseRevolutCsv(csv);
      holdings.revolut = parsed.positions.map((p) => ({
        id: uid(),
        source: "revolut",
        symbol: p.symbol,
        name: p.name,
        exchange: null,
        quantity: p.quantity,
        avgPrice: p.avg_price,
        lastPrice: p.last_price,
        dayChangePct: null,
        currency: p.currency,
        snapshotAt: new Date().toISOString(),
      }));
      return { saved: holdings.revolut.length };
    },
    async companies(region: Region) {
      await wait(200);
      return structuredClone(
        companies
          .filter((c) => c.region === region)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
    },
    async setCompanyStatus(id, status) {
      await wait(150);
      const c = companies.find((x) => x.id === id);
      if (c) {
        c.status = status;
        c.updatedAt = new Date().toISOString();
      }
    },
    async saveCompany(input) {
      await wait(250);
      const saved: Company = {
        ...input,
        id: input.id ?? uid(),
        updatedAt: new Date().toISOString(),
      };
      companies = [saved, ...companies.filter((c) => c.id !== saved.id)];
      return structuredClone(saved);
    },
    async deleteCompany(id) {
      await wait(200);
      companies = companies.filter((c) => c.id !== id);
      notes = notes.filter((n) => n.companyId !== id);
      docs = docs.filter((d) => d.companyId !== id);
    },
    async notes(companyId) {
      await wait(150);
      return structuredClone(notes.filter((n) => n.companyId === companyId));
    },
    async addNote(companyId, body) {
      await wait(200);
      const note: Note = { id: uid(), companyId, body, createdAt: new Date().toISOString() };
      notes = [note, ...notes];
      const c = companies.find((x) => x.id === companyId);
      if (c) c.updatedAt = note.createdAt;
      return structuredClone(note);
    },
    async deleteNote(id) {
      await wait(150);
      notes = notes.filter((n) => n.id !== id);
    },
    async documents(companyId) {
      await wait(150);
      return structuredClone(docs.filter((d) => d.companyId === companyId));
    },
    async uploadDocument(companyId, file, docType) {
      await wait(500);
      const doc: CompanyDocument = {
        id: uid(),
        companyId,
        title: file.name.replace(/\.[a-z0-9]+$/i, ""),
        docType,
        storagePath: "demo",
        summary: null,
        keyTakeaways: null,
        uploadedAt: new Date().toISOString(),
        externalUrl: null,
        mimeType: file.type || null,
      };
      files.set(doc.id, URL.createObjectURL(file));
      docs = [doc, ...docs];
      return structuredClone(doc);
    },
    async summarizeDocument(id) {
      await wait(1800);
      const doc = docs.find((d) => d.id === id);
      if (!doc) throw new Error("Document not found");
      doc.summary =
        "Demo mode: in the live dashboard Claude reads the full PDF here and writes a summary, the thesis, key risks and the metrics (with period and currency), then fills any empty fields on the company.";
      doc.keyTakeaways =
        "• Summary written by Claude\n• Thesis and risks extracted\n• Metrics cited with period and currency";
      return structuredClone(doc);
    },
    async documentUrl(doc) {
      return files.get(doc.id) ?? null;
    },
    async profiles() {
      await wait(150);
      return structuredClone([...profiles.values()]);
    },
    async financials(symbol) {
      await wait(150);
      const h = findHolding(symbol);
      return h ? demoFinancials(h) : [];
    },
    async transactions(scope) {
      await wait(150);
      const sources = scope === "india" ? ["kite", "kite_mf"] : ["revolut"];
      return structuredClone(trades.filter((t) => sources.includes(t.source)));
    },
    async setOpeningLots(rows) {
      await wait(250);
      const symbols = new Set(rows.map((r) => r.symbol));
      trades = [
        ...trades.filter((t) => !(t.estimated && symbols.has(t.symbol))),
        ...rows
          .filter((r) => r.quantity > 0 && r.date)
          .map((r) => ({ ...r, amount: null, estimated: true })),
      ].sort((a, b) => a.date.localeCompare(b.date));
    },
    async importTrades(rows) {
      await wait(400);
      const symbols = new Set(rows.map((r) => r.symbol));
      trades = [
        ...trades.filter((t) => !symbols.has(t.symbol)),
        ...rows.map((r) => ({ ...r, amount: null })),
      ].sort((a, b) => a.date.localeCompare(b.date));
      return { saved: rows.length };
    },
    async researchCompany(symbol) {
      const h = findHolding(symbol);
      const p = profiles.get(symbol);
      if (!h || !p) return;
      p.researchStatus = "running";
      p.researchStartedAt = new Date().toISOString();
      setTimeout(
        () =>
          profiles.set(symbol, {
            ...demoProfile(h, !!p.memo),
            researchedAt: new Date().toISOString(),
          }),
        2500,
      );
    },
    async ask(message, conversationId) {
      await new Promise((r) => setTimeout(r, 600));
      return {
        reply: `This is the demo, so there's no live data to analyse. In your own dashboard the assistant answers questions like "${message.slice(0, 80)}" from your holdings, company research and private company notes.`,
        conversationId: conversationId ?? "demo",
      };
    },

    async refreshQuotes() {
      return { updated: 0, failed: [] };
    },

    async writeMemo(symbol) {
      const h = findHolding(symbol);
      const p = profiles.get(symbol);
      if (!h || !p) return;
      p.memoStatus = "running";
      p.memoStartedAt = new Date().toISOString();
      setTimeout(() => profiles.set(symbol, demoProfile(h, true)), 3000);
    },
  };
}
