// Demo-mode research: company descriptions and websites (for logos), plus illustrative
// financials and trade histories. Financial figures here are generated, not real company data,
// and every screen that shows them says so.
import type { CompanyProfile, FinancialPeriod, Holding, Txn } from "./types";

type Info = [
  name: string,
  website: string,
  sector: string,
  country: string,
  oneLiner: string,
  description: string,
  scale: number,
  fund?: boolean,
];

export const DEMO_INFO: Record<string, Info> = {
  RELIANCE: [
    "Reliance Industries",
    "ril.com",
    "Conglomerate",
    "India",
    "Oil refining, retail stores and Jio mobile and broadband.",
    "Reliance runs one of the world's largest refining complexes, India's biggest retail chain and Jio, the largest mobile operator in India. Most profit now comes from the consumer businesses.",
    9_000_000,
  ],
  HDFCBANK: [
    "HDFC Bank",
    "hdfcbank.com",
    "Banking",
    "India",
    "India's largest private-sector bank by assets.",
    "Retail and corporate banking, credit cards and mortgages (after merging with parent HDFC Ltd in 2023). Earns mainly net interest income and fees.",
    3_500_000,
    false,
  ],
  INFY: [
    "Infosys",
    "infosys.com",
    "IT services",
    "India",
    "IT services and consulting for large enterprises.",
    "Builds and runs software, cloud and data systems for global enterprises, mostly in North America and Europe, on multi-year contracts.",
    1_500_000,
  ],
  TCS: [
    "Tata Consultancy Services",
    "tcs.com",
    "IT services",
    "India",
    "India's largest IT services company.",
    "Application development, infrastructure management and consulting for banks, retailers and manufacturers worldwide. Part of the Tata Group.",
    2_300_000,
  ],
  ICICIBANK: [
    "ICICI Bank",
    "icicibank.com",
    "Banking",
    "India",
    "Large private-sector bank in India.",
    "Retail, business and corporate banking with a large digital channel, plus insurance and asset-management subsidiaries.",
    2_500_000,
  ],
  BHARTIARTL: [
    "Bharti Airtel",
    "airtel.in",
    "Telecom",
    "India",
    "Mobile, broadband and enterprise telecom services.",
    "India's second-largest mobile operator by subscribers, with operations in 14 African countries through Airtel Africa.",
    1_500_000,
  ],
  LT: [
    "Larsen & Toubro",
    "larsentoubro.com",
    "Engineering & construction",
    "India",
    "Engineering, construction and infrastructure projects.",
    "Builds infrastructure, energy and defence projects in India and the Middle East, with IT services subsidiaries (LTIMindtree, L&T Technology Services).",
    2_200_000,
  ],
  TITAN: [
    "Titan Company",
    "titancompany.in",
    "Consumer",
    "India",
    "Jewellery (Tanishq), watches and eyewear retail.",
    "A Tata Group company selling jewellery, watches and eyewear through its own stores. Jewellery is most of revenue.",
    550_000,
  ],
  ASIANPAINT: [
    "Asian Paints",
    "asianpaints.com",
    "Paints",
    "India",
    "India's largest decorative paints maker.",
    "Manufactures and sells decorative and industrial paints through a dealer network across India and abroad, plus home-decor products.",
    350_000,
  ],
  BAJFINANCE: [
    "Bajaj Finance",
    "bajajfinserv.in",
    "Consumer lending",
    "India",
    "Consumer, SME and mortgage loans.",
    "A non-bank lender offering consumer-durable, personal, SME and home loans, largely originated at point of sale and through its app.",
    550_000,
    false,
  ],
  ITC: [
    "ITC",
    "itcportal.com",
    "Consumer",
    "India",
    "Cigarettes, packaged foods, paper and agribusiness.",
    "Cigarettes generate most profit; ITC is expanding packaged foods and personal care, and also runs paperboard and agri businesses.",
    700_000,
  ],
  "PPFAS-FLEXI": [
    "Parag Parikh Flexi Cap Fund",
    "amc.ppfas.com",
    "Mutual fund",
    "India",
    "Flexi-cap equity mutual fund investing in India and abroad.",
    "An open-ended equity fund that holds Indian and some overseas stocks, with a value-oriented approach.",
    0,
    true,
  ],
  "AXIS-SMALLCAP": [
    "Axis Small Cap Fund",
    "axismf.com",
    "Mutual fund",
    "India",
    "Equity mutual fund investing in Indian small-cap companies.",
    "An open-ended fund holding a diversified portfolio of smaller listed Indian companies.",
    0,
    true,
  ],
  "UTI-NIFTY50": [
    "UTI Nifty 50 Index Fund",
    "utimf.com",
    "Index fund",
    "India",
    "Index fund tracking the Nifty 50.",
    "Holds the 50 stocks of the Nifty 50 index in index weights, with a low expense ratio.",
    0,
    true,
  ],
  NVDA: [
    "NVIDIA",
    "nvidia.com",
    "Semiconductors",
    "United States",
    "GPUs and AI computing systems for data centres and PCs.",
    "Designs GPUs, networking and software used to train and run AI models in data centres, plus gaming and automotive chips. Manufacturing is outsourced to TSMC.",
    130_000,
  ],
  MSFT: [
    "Microsoft",
    "microsoft.com",
    "Software",
    "United States",
    "Cloud (Azure), Office 365, Windows and LinkedIn.",
    "Sells cloud infrastructure and productivity software to businesses and consumers; Azure and Microsoft 365 drive most growth.",
    260_000,
  ],
  AAPL: [
    "Apple",
    "apple.com",
    "Consumer electronics",
    "United States",
    "iPhone, Mac, iPad, wearables and services.",
    "Designs consumer devices and earns a growing share of profit from services such as the App Store, iCloud and payments.",
    390_000,
  ],
  GOOGL: [
    "Alphabet",
    "abc.xyz",
    "Internet",
    "United States",
    "Google Search, YouTube, Android and Google Cloud.",
    "Earns mainly from search and YouTube advertising, with Google Cloud and subscriptions growing.",
    350_000,
  ],
  AMZN: [
    "Amazon",
    "amazon.com",
    "Internet retail & cloud",
    "United States",
    "Online retail, AWS cloud and advertising.",
    "Runs a global online marketplace and logistics network; AWS and advertising generate most operating profit.",
    640_000,
  ],
  ASML: [
    "ASML Holding",
    "asml.com",
    "Semiconductor equipment",
    "Netherlands",
    "Lithography machines used to make chips.",
    "The only supplier of EUV lithography systems, which leading chipmakers need for advanced nodes; also services its installed base.",
    30_000,
  ],
  TSM: [
    "Taiwan Semiconductor",
    "tsmc.com",
    "Semiconductors",
    "Taiwan",
    "Contract chip manufacturing for Apple, NVIDIA and others.",
    "The world's largest contract chipmaker, producing most of the leading-edge chips designed by other companies.",
    90_000,
  ],
  META: [
    "Meta Platforms",
    "meta.com",
    "Internet",
    "United States",
    "Facebook, Instagram and WhatsApp, funded by advertising.",
    "Earns almost all revenue from ads across its apps and invests heavily in AI and virtual reality.",
    165_000,
  ],
  VOO: [
    "Vanguard S&P 500 ETF",
    "investor.vanguard.com",
    "ETF",
    "United States",
    "ETF tracking the S&P 500 index.",
    "Holds the 500 large US companies in the S&P 500 at a very low expense ratio.",
    0,
    true,
  ],
};

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7);

export function demoProfile(h: Holding, withMemo: boolean): CompanyProfile {
  const info = DEMO_INFO[h.symbol];
  const now = new Date().toISOString();
  return {
    symbol: h.symbol,
    name: info?.[0] ?? h.name,
    website: info?.[1] ?? null,
    oneLiner: info?.[4] ?? null,
    description: info?.[5] ?? null,
    sector: info?.[2] ?? null,
    country: info?.[3] ?? null,
    isFund: !!info?.[7],
    reportingCurrency: h.currency,
    presentation: info?.[7]
      ? { title: null, url: null, date: null }
      : {
          title: "Latest results presentation (demo link)",
          url: info ? `https://${info[1]}` : null,
          date: "Q2 FY26",
        },
    irUrl: info ? `https://${info[1]}` : null,
    // Illustrative: market cap 1.5–5× sales, modest net debt.
    marketCapM: info && !info[7] ? info[6] * (1.5 + (hash(h.symbol) % 35) / 10) : null,
    netDebtM: info && !info[7] ? info[6] * 0.1 : null,
    sharesOutM: null,
    valuationAsOf: now.slice(0, 10),
    notes: "Demo mode: figures are illustrative and generated, not actual company data.",
    sources: [],
    researchStatus: info ? "done" : "idle",
    researchError: null,
    researchStartedAt: null,
    researchedAt: info ? now : null,
    memo: withMemo && info ? demoMemo(info[0], h) : null,
    memoStatus: withMemo && info ? "done" : "idle",
    memoError: null,
    memoStartedAt: null,
    memoAt: withMemo && info ? now : null,
    illustrative: true,
  };
}

export function demoFinancials(h: Holding): FinancialPeriod[] {
  const info = DEMO_INFO[h.symbol];
  if (!info || info[7]) return [];
  const r = rng(hash(h.symbol));
  const base = info[6];
  const growth = 0.06 + r() * 0.18;
  const gm = 0.3 + r() * 0.45;
  const em = gm * (0.45 + r() * 0.35);
  const out: FinancialPeriod[] = [];
  const year = new Date().getFullYear() - 1;
  let prevRev: number | null = null;
  for (let i = 3; i >= 0; i--) {
    const rev = (base / Math.pow(1 + growth, i)) * (0.97 + r() * 0.06);
    const ebitda = rev * em * (0.95 + r() * 0.1);
    const cfo = ebitda * (0.7 + r() * 0.2);
    const capex = rev * (0.04 + r() * 0.08);
    out.push({
      label: `FY${year - i}`,
      periodEnd: `${year - i}-${h.currency === "INR" ? "03-31" : "12-31"}`,
      type: "annual",
      currency: h.currency,
      revenue: rev,
      revenueYoyPct: prevRev ? (rev / prevRev - 1) * 100 : null,
      grossProfit: rev * gm,
      grossMarginPct: gm * 100,
      ebitda,
      ebitdaMarginPct: (ebitda / rev) * 100,
      cfo,
      capex,
      fcf: cfo - capex,
      netIncome: ebitda * 0.55,
      sourceUrl: null,
    });
    prevRev = rev;
  }
  return out;
}

/** 2-3 buy lots per holding whose weighted average equals the holding's average price. */
export function demoTrades(holdings: Holding[]): Txn[] {
  const out: Txn[] = [];
  for (const h of holdings) {
    const r = rng(hash(h.symbol) + 11);
    const q1 = h.quantity * 0.5;
    const q2 = h.quantity * 0.3;
    const q3 = h.quantity - q1 - q2;
    const p1 = h.avgPrice * (0.82 + r() * 0.08);
    const p2 = h.avgPrice * (1.02 + r() * 0.1);
    const p3 = (h.avgPrice * h.quantity - q1 * p1 - q2 * p2) / q3;
    const days = [400 + r() * 900, 150 + r() * 250, 20 + r() * 120].sort((a, b) => b - a);
    const lots: [number, number, number][] = [
      [q1, p1, days[0]!],
      [q2, p2, days[1]!],
      [q3, p3, days[2]!],
    ];
    for (const [q, p, d] of lots) {
      out.push({
        source: h.source,
        symbol: h.symbol,
        date: new Date(Date.now() - d * 864e5).toISOString().slice(0, 10),
        side: "buy",
        quantity: q,
        price: p,
        amount: null,
        currency: h.currency,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function demoMemo(name: string, h: Holding): string {
  return `> **Demo memo.** In the live dashboard Claude writes this from the company research (profile, financials, valuation) and your actual position. The text below shows the structure only.

## Summary
${name} is held as a core position. The memo states what the company does, the entry price and holding period, the return to date (XIRR), and the thesis in three to five sentences.

## Business and why it matters
What the company sells, to whom, and how it makes money, followed by the structural trends the thesis depends on.

## Financial performance
Revenue growth, gross and EBITDA margins, free cash flow (CFO − capex) and cash conversion across the last three fiscal years, with anything unusual called out.

## Valuation
P/E, EV/EBITDA, EV/Sales and FCF yield, and what the current price implies about future growth.

## Competitive position and moat
Market structure, main competitors and each moat dimension rated STRONG / MODERATE / LOW with evidence.

## Management and capital allocation
Leadership, buybacks, dividends, M&A and balance sheet.

## The position
${h.quantity.toLocaleString()} shares at an average of ${h.avgPrice.toFixed(2)} ${h.currency}; holding period, XIRR and portfolio weight.

## Key risks and open questions
Three to five risks with likelihood, severity and mitigants, then specific questions to check at the next results.

## Position view
**Hold / Add / Trim / Exit**, with the reason, the trigger that would change the view, and what to watch next quarter.`;
}
