// Number formatting. INR uses the Indian grouping (lakh / crore); everything else uses
// compact international notation for headline figures.
const SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

export function currencySymbol(ccy: string) {
  return SYMBOLS[ccy] ?? `${ccy} `;
}

/** Full-precision money for table cells, e.g. ₹1,24,500.00 or $1,245.10 */
export function money(value: number | null | undefined, ccy = "INR", digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  const locale = ccy === "INR" ? "en-IN" : "en-US";
  const abs = Math.abs(value).toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value < 0 ? "−" : ""}${currencySymbol(ccy)}${abs}`;
}

/** Compact money for headlines, e.g. ₹12.4L, ₹1.2Cr, $48.2K, $1.3M */
export function moneyCompact(value: number | null | undefined, ccy = "INR") {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  const sym = currencySymbol(ccy);
  if (ccy === "INR") {
    if (abs >= 1e7) return `${sign}${sym}${trim(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}${sym}${trim(abs / 1e5)}L`;
    if (abs >= 1e3) return `${sign}${sym}${trim(abs / 1e3)}K`;
    return `${sign}${sym}${abs.toFixed(0)}`;
  }
  if (abs >= 1e9) return `${sign}${sym}${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${sym}${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${sym}${trim(abs / 1e3)}K`;
  return `${sign}${sym}${abs.toFixed(0)}`;
}

function trim(n: number) {
  return n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
}

export function signedMoney(
  value: number | null | undefined,
  ccy = "INR",
  compact = false,
  digits = 2,
) {
  if (value == null || !Number.isFinite(value)) return "—";
  const body = compact ? moneyCompact(Math.abs(value), ccy) : money(Math.abs(value), ccy, digits);
  return `${value >= 0 ? "+" : "−"}${body}`;
}

export function pct(value: number | null | undefined, digits = 2, signed = true) {
  if (value == null || !Number.isFinite(value)) return "—";
  const s = Math.abs(value).toFixed(digits);
  if (!signed) return `${s}%`;
  return `${value >= 0 ? "+" : "−"}${s}%`;
}

export function qty(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/** Values stored in millions of a currency: ₹ shown in crore, others in M / B. */
export function moneyMillions(valueM: number | null | undefined, ccy: string | null) {
  if (valueM == null || !Number.isFinite(valueM)) return "—";
  const c = ccy ?? "USD";
  const sign = valueM < 0 ? "−" : "";
  const abs = Math.abs(valueM);
  if (c === "INR") {
    const cr = abs / 10;
    return `${sign}₹${cr.toLocaleString("en-IN", { maximumFractionDigits: cr >= 100 ? 0 : 1 })} Cr`;
  }
  const sym = currencySymbol(c);
  if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)}B`;
  return `${sign}${sym}${abs.toFixed(abs >= 100 ? 0 : 1)}M`;
}

export function multiple(x: number | null | undefined) {
  if (x == null || !Number.isFinite(x) || x <= 0) return "—";
  return `${x >= 100 ? x.toFixed(0) : x.toFixed(1)}×`;
}
