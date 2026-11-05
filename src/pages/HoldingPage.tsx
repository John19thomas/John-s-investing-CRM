import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ArrowLeft, ExternalLink, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  Delta,
  PillButton,
  Skeleton,
  StatTile,
} from "@/components/app/primitives";
import { CompanyLogo } from "@/components/holdings/CompanyLogo";
import { Markdown } from "@/components/holdings/Markdown";
import { statsBySymbol } from "@/components/holdings/positions";
import { formatHoldingPeriod } from "@shared/performance";
import {
  isRunning,
  useFinancials,
  useHoldings,
  useLiveQuotes,
  useProfiles,
  useResearchCompany,
  useTransactions,
  useWriteMemo,
} from "@/data/hooks";
import { useRepo } from "@/data/RepoContext";
import {
  invested,
  marketValue,
  pnl,
  pnlPct,
  type CompanyProfile,
  type FinancialPeriod,
  type Holding,
} from "@/data/types";
import { money, moneyCompact, moneyMillions, multiple, pct, qty, signedMoney } from "@/lib/format";

export default function HoldingPage() {
  const { symbol: raw } = useParams();
  const symbol = decodeURIComponent(raw ?? "");
  const { base } = useRepo();
  const india = useHoldings("india");
  const global = useHoldings("revolut");
  const profiles = useProfiles();

  const inIndia = (india.data ?? []).filter((h) => h.symbol === symbol);
  const inGlobal = (global.data ?? []).filter((h) => h.symbol === symbol);
  const scope = inIndia.length ? "india" : "revolut";
  const lots = inIndia.length ? inIndia : inGlobal;
  const txns = useTransactions(scope);
  useLiveQuotes(scope);

  const holding: Holding | null = useMemo(() => {
    if (!lots.length) return null;
    const q = lots.reduce((a, h) => a + h.quantity, 0);
    const cost = lots.reduce((a, h) => a + invested(h), 0);
    return { ...lots[0]!, quantity: q, avgPrice: q ? cost / q : 0 };
  }, [lots]);

  const profile = (profiles.data ?? []).find((p) => p.symbol === symbol) ?? null;
  const fin = useFinancials(holding ? symbol : null, profile?.researchedAt ?? null);
  const stats = useMemo(
    () =>
      holding
        ? statsBySymbol(
            [holding],
            (txns.data ?? []).filter((t) => t.symbol === symbol),
          )
        : null,
    [holding, txns.data, symbol],
  );
  const s = stats?.get(symbol) ?? null;

  const back = scope === "india" ? `${base}/india` : `${base}/revolut`;
  const backLabel = scope === "india" ? "India equities" : "Global equities";

  if (india.isLoading || global.isLoading) return <Skeleton className="h-[480px]" />;
  if (!holding) {
    return (
      <div className="py-20">
        <p className="text-ink-2">{symbol} isn't in your current holdings.</p>
        <Link to={`${base}/india`} className="mt-4 inline-block underline underline-offset-2">
          Back to holdings
        </Link>
      </div>
    );
  }

  const name = profile?.name ?? holding.name ?? symbol;
  const v = marketValue(holding);
  const ccy = holding.currency;
  const noTrades = !s || s.tradedQuantity === 0;
  const tradeHint =
    scope === "india"
      ? "Import your Zerodha tradebook on the India page to see this."
      : "Re-import your Revolut statement to see this.";

  return (
    <div className="space-y-10 pb-20">
      <Link
        to={back}
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> {backLabel}
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-5">
          <CompanyLogo name={name} website={profile?.website} size={72} />
          <div className="min-w-0">
            <h1 className="font-display text-[34px] leading-tight sm:text-[46px]">{name}</h1>
            <p className="mt-1 text-[14px] text-ink-3">
              {[
                holding.source === "kite_mf" ? "Mutual fund" : symbol,
                holding.exchange,
                profile?.sector,
                profile?.country,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {profile?.oneLiner && (
              <p className="mt-3 max-w-2xl text-[17px] text-ink-2">{profile.oneLiner}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
              {profile?.website && (
                <a
                  href={`https://${profile.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  {profile.website} <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
              {profile?.irUrl && (
                <a
                  href={profile.irUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  Investor relations <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </div>
        <ResearchButton holding={holding} profile={profile} name={name} />
      </header>

      {profile?.illustrative && (
        <p className="border-l-2 border-ink bg-paper-2 px-4 py-3 text-[14px] text-ink-2">
          Demo: the description is real; financials, valuation and the memo are illustrative, not
          actual company data.
        </p>
      )}

      {/* Position */}
      <section>
        <SectionTitle>Your position</SectionTitle>
        <Card className="grid grid-cols-2 divide-line max-lg:[&>*]:border-b lg:grid-cols-4 lg:divide-x">
          <StatTile
            label="Value"
            value={moneyCompact(v ?? invested(holding), ccy)}
            sub={<span className="tabular text-ink-3">{qty(holding.quantity)} units</span>}
          />
          <StatTile
            label="Blended entry price"
            value={money(holding.avgPrice, ccy)}
            sub={
              <span className="tabular text-ink-3">Last price {money(holding.lastPrice, ccy)}</span>
            }
          />
          <StatTile
            label="Return"
            value={<Delta value={pnlPct(holding)}>{pct(pnlPct(holding), 1)}</Delta>}
            sub={<Delta value={pnl(holding)}>{signedMoney(pnl(holding), ccy, true)}</Delta>}
          />
          <StatTile
            label="XIRR"
            value={
              s?.xirr != null ? (
                <Delta value={s.xirr}>{pct(s.xirr * 100, 1)}</Delta>
              ) : (
                <span className="text-ink-3">—</span>
              )
            }
            sub={
              <span className="text-ink-3">
                {noTrades
                  ? "Needs trade history"
                  : !s?.complete
                    ? `Trades cover ${qty(s!.tradedQuantity)} of ${qty(holding.quantity)} units`
                    : "Annualised, incl. dividends"}
              </span>
            }
          />
          <StatTile
            label="Held since"
            value={s?.heldSince ? format(parseISO(s.heldSince), "MMM yyyy") : "—"}
            sub={
              <span className="text-ink-3">
                {s?.heldSince ? "Oldest lot still held" : "Needs trade history"}
              </span>
            }
          />
          <StatTile
            label="Average holding period"
            value={formatHoldingPeriod(s?.avgHoldingDays ?? null)}
            sub={<span className="text-ink-3">Weighted by units held</span>}
          />
          <StatTile
            label="Cost basis"
            value={moneyCompact(invested(holding), ccy)}
            sub={<span className="text-ink-3">Units × blended entry</span>}
          />
          <StatTile
            label="Dividends"
            value={s && s.dividends ? moneyCompact(s.dividends, ccy) : "—"}
            sub={
              <span className="text-ink-3">
                {scope === "india" ? "Not in Zerodha tradebook" : "From Revolut statement"}
              </span>
            }
          />
        </Card>
        {noTrades && (
          <p className="mt-3 text-[14px] text-ink-3">Holding period and XIRR: {tradeHint}</p>
        )}
      </section>

      {/* About + presentation + valuation */}
      {profile?.researchStatus === "done" ? (
        <>
          {!profile.isFund && (
            <KeyMetrics profile={profile} holding={holding} periods={fin.data ?? []} />
          )}
          {!profile.isFund && <CheatsheetCard profile={profile} />}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="About" />
              <p className="px-5 pt-3 pb-6 text-[15px] leading-relaxed text-ink-2 sm:px-6">
                {profile.description ?? "—"}
              </p>
              {!profile.isFund && <Presentation profile={profile} />}
            </Card>
            {!profile.isFund && (
              <Valuation profile={profile} holding={holding} periods={fin.data ?? []} />
            )}
          </div>
          {!profile.isFund && (
            <Financials periods={fin.data ?? []} loading={fin.isLoading} profile={profile} />
          )}
          {!profile.isFund && <Memo profile={profile} symbol={symbol} />}
          <Sources profile={profile} />
        </>
      ) : (
        <Card>
          <div className="px-6 py-10 text-center">
            <h2 className="text-[18px] font-semibold tracking-tight">No research yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-[15px] text-ink-2">
              Claude searches the company's investor-relations site and filings for a description,
              the latest investor presentation, three years of financials and valuation data. It
              takes 1–3 minutes.
            </p>
            {profile?.researchStatus === "error" && (
              <p className="mx-auto mt-3 max-w-lg text-[14px] text-loss">
                Last attempt failed: {profile.researchError}
              </p>
            )}
            <div className="mt-6 flex justify-center">
              <ResearchButton holding={holding} profile={profile} name={name} />
            </div>
          </div>
        </Card>
      )}

      <Trades
        symbol={symbol}
        txns={(txns.data ?? []).filter((t) => t.symbol === symbol)}
        ccy={ccy}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[13px] font-medium tracking-[0.08em] text-ink-3 uppercase">
      {children}
    </h2>
  );
}

function ResearchButton({
  holding,
  profile,
  name,
}: {
  holding: Holding;
  profile: CompanyProfile | null;
  name: string;
}) {
  const research = useResearchCompany();
  const running = !!profile && isRunning(profile.researchStatus, profile.researchStartedAt);
  if (running || research.isPending) {
    return (
      <span className="inline-flex items-center gap-2 text-[14px] text-ink-2">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Researching… usually 1–3 minutes
      </span>
    );
  }
  return (
    <PillButton
      variant={profile?.researchStatus === "done" ? "outline" : "solid"}
      onClick={() =>
        research.mutate(
          { symbol: holding.symbol, name, exchange: holding.exchange },
          {
            onSuccess: () =>
              toast.message("Research started", {
                description: "This page updates when it's done.",
              }),
            onError: (e) => toast.error("Couldn't start research", { description: e.message }),
          },
        )
      }
    >
      {profile?.researchStatus === "done" ? (
        <>
          <RefreshCw className="size-4" aria-hidden /> Refresh research
        </>
      ) : (
        <>
          <Sparkles className="size-4" aria-hidden /> Research with Claude
        </>
      )}
    </PillButton>
  );
}

function Presentation({ profile }: { profile: CompanyProfile }) {
  const p = profile.presentation;
  if (!p.url && !p.title) return null;
  return (
    <a
      href={p.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="mx-5 mb-6 flex items-center gap-4 rounded-sm border border-line px-4 py-4 transition-colors hover:bg-paper-2 sm:mx-6"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-ink text-paper">
        <FileText className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] text-ink-3">Latest investor presentation</span>
        <span className="block truncate font-medium">{p.title ?? "Investor presentation"}</span>
        {p.date && <span className="block text-[13px] text-ink-3">{p.date}</span>}
      </span>
      <ExternalLink className="size-4 shrink-0 text-ink-3" aria-hidden />
    </a>
  );
}

/** Live market cap when the share count and price share a currency; otherwise as researched. */
function marketCap(profile: CompanyProfile, holding: Holding) {
  const live =
    profile.sharesOutM != null &&
    holding.lastPrice != null &&
    profile.reportingCurrency === holding.currency;
  return { live, value: live ? profile.sharesOutM! * holding.lastPrice! : profile.marketCapM };
}

function KeyMetrics({
  profile,
  holding,
  periods,
}: {
  profile: CompanyProfile;
  holding: Holding;
  periods: FinancialPeriod[];
}) {
  const ccy = profile.reportingCurrency;
  const quarter = periods.filter((p) => p.type === "quarter").at(-1) ?? null;
  // Fall back to the latest quarter when no annual or TTM figures were researched.
  const annual = latestPeriod(periods);
  const latest = annual ?? quarter;
  const mcap = marketCap(profile, holding);
  const m = (x: number | null | undefined) => moneyMillions(x ?? null, ccy);
  const margin = (x: number | null | undefined, rev: number | null | undefined) =>
    x != null && rev ? `${pct((x / rev) * 100, 1, false)} margin` : null;
  const on = latest ? latest.label : null;
  const tiles: { label: string; value: string; sub: string | null }[] = [
    {
      label: "Revenue",
      value: m(latest?.revenue),
      sub:
        [
          on,
          latest?.revenueYoyPct != null ? `${pct(latest.revenueYoyPct, 1)} YoY` : null,
          annual && quarter?.revenue != null ? `${quarter.label}: ${m(quarter.revenue)}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
    },
    {
      label: "ARR",
      value: profile.arr ? m(profile.arr.valueM) : "—",
      sub: profile.arr
        ? [profile.arr.label, profile.arr.asOf].filter(Boolean).join(" · ")
        : "Not disclosed by the company",
    },
    {
      label: "Gross margin",
      value: latest?.grossMarginPct != null ? pct(latest.grossMarginPct, 1, false) : "—",
      sub:
        latest?.grossMarginPct != null
          ? [
              on,
              annual && quarter?.grossMarginPct != null
                ? `${quarter.label}: ${pct(quarter.grossMarginPct, 1, false)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "Not meaningful or not reported",
    },
    {
      label: "EBITDA",
      value: m(latest?.ebitda),
      sub: [on, margin(latest?.ebitda, latest?.revenue)].filter(Boolean).join(" · ") || null,
    },
    {
      label: "Free cash flow",
      value: m(latest?.fcf),
      sub: [on, "CFO − capex", margin(latest?.fcf, latest?.revenue)].filter(Boolean).join(" · "),
    },
    {
      label: "Market cap",
      value: m(mcap.value),
      sub: mcap.live
        ? "Live price × shares outstanding"
        : profile.valuationAsOf
          ? `As of ${profile.valuationAsOf}`
          : null,
    },
  ];
  return (
    <section>
      <SectionTitle>Key numbers</SectionTitle>
      <Card className="grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 max-lg:[&>*]:border-b lg:divide-x">
        {tiles.map((t) => (
          <StatTile
            key={t.label}
            label={t.label}
            value={<span className="tabular">{t.value}</span>}
            sub={t.sub ? <span className="text-ink-3">{t.sub}</span> : undefined}
          />
        ))}
      </Card>
    </section>
  );
}

function CheatsheetCard({ profile }: { profile: CompanyProfile }) {
  const c = profile.cheatsheet;
  const p = profile.presentation;
  const blocks: [string, string[]][] = c
    ? [
        ["Highlights", c.highlights],
        ["Management commentary", c.managementCommentary],
        ["Guidance", c.guidance],
        ["Product launches", c.productLaunches],
        ["Other updates", c.otherUpdates],
      ]
    : [];
  return (
    <section>
      <SectionTitle>Quarterly cheatsheet</SectionTitle>
      <Card>
        {!c ? (
          <p className="px-6 py-8 text-[15px] text-ink-2">
            No cheatsheet yet. It's written from the latest results, earnings call and investor
            presentation the next time this company is researched (automatically after each
            quarterly result, or use Refresh research above).
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-4 border-b border-line px-6 py-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="text-[13px] text-ink-3">
                  {[c.period, c.resultsDate && `results ${c.resultsDate}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-2 text-[19px] leading-snug font-medium tracking-tight">
                  {c.headline}
                </p>
              </div>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper hover:opacity-85"
                >
                  <FileText className="size-4" aria-hidden /> Investor presentation
                </a>
              )}
            </div>
            <div className="grid gap-x-10 gap-y-7 px-6 py-6 md:grid-cols-2">
              {blocks
                .filter(([, xs]) => xs.length > 0)
                .map(([title, xs]) => (
                  <div key={title}>
                    <h3 className="text-[13px] font-medium text-ink-3">{title}</h3>
                    <ul className="mt-2.5 space-y-2 text-[14px] leading-relaxed text-ink-2">
                      {xs.map((x, i) => (
                        <li key={i} className="flex gap-2.5">
                          <span className="mt-[9px] size-1 shrink-0 rounded-full bg-ink-3" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </>
        )}
        <p className="border-t border-line px-6 py-3 text-[12px] text-ink-3">
          Refreshes automatically after each quarterly result
          {profile.nextEarningsDate ? ` · next results ${profile.nextEarningsDate}` : ""}
          {profile.researchedAt &&
            ` · updated ${formatDistanceToNow(new Date(profile.researchedAt), { addSuffix: true })}`}
        </p>
      </Card>
    </section>
  );
}

function latestPeriod(periods: FinancialPeriod[]) {
  return (
    [...periods].reverse().find((p) => p.type === "ttm") ??
    periods.filter((p) => p.type === "annual").at(-1) ??
    null
  );
}

function Valuation({
  profile,
  holding,
  periods,
}: {
  profile: CompanyProfile;
  holding: Holding;
  periods: FinancialPeriod[];
}) {
  const latest = latestPeriod(periods);
  const { live, value: mcap } = marketCap(profile, holding);
  const ev = mcap != null ? mcap + (profile.netDebtM ?? 0) : null;
  const r = (a: number | null, b: number | null | undefined) =>
    a != null && b != null && b > 0 ? a / b : null;
  const rows: [string, string][] = [
    ["Market cap", moneyMillions(mcap, profile.reportingCurrency)],
    ["Net debt (cash)", moneyMillions(profile.netDebtM, profile.reportingCurrency)],
    ["Enterprise value", moneyMillions(ev, profile.reportingCurrency)],
    ["P/E", multiple(r(mcap, latest?.netIncome))],
    ["EV / EBITDA", multiple(r(ev, latest?.ebitda))],
    ["EV / Sales", multiple(r(ev, latest?.revenue))],
    ["P / FCF", multiple(r(mcap, latest?.fcf))],
    ["FCF yield", latest?.fcf != null && mcap ? pct((latest.fcf / mcap) * 100, 1, false) : "—"],
  ];
  return (
    <Card>
      <CardHeader
        title="Valuation"
        sub={
          latest
            ? `On ${latest.label} · ${live ? "live price" : `as of ${profile.valuationAsOf ?? "research date"}`}`
            : "No financials"
        }
      />
      <dl className="tabular px-5 pt-3 pb-5 text-[14px] sm:px-6">
        {rows.map(([k, val]) => (
          <div
            key={k}
            className="flex justify-between border-b border-line/70 py-2.5 last:border-0"
          >
            <dt className="text-ink-3">{k}</dt>
            <dd className="font-medium">{val}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Financials({
  periods,
  loading,
  profile,
}: {
  periods: FinancialPeriod[];
  loading: boolean;
  profile: CompanyProfile;
}) {
  const ccy = profile.reportingCurrency;
  const m = (x: number | null) => moneyMillions(x, ccy);
  const p = (x: number | null) => (x == null ? "—" : pct(x, 1, false));
  const g = (x: number | null) => (x == null ? "—" : pct(x, 1));
  const rows: [string, (f: FinancialPeriod) => string, boolean?][] = [
    ["Revenue", (f) => m(f.revenue), true],
    ["Revenue growth", (f) => g(f.revenueYoyPct)],
    ["Gross profit", (f) => m(f.grossProfit)],
    ["Gross margin", (f) => p(f.grossMarginPct)],
    ["EBITDA", (f) => m(f.ebitda), true],
    ["EBITDA margin", (f) => p(f.ebitdaMarginPct)],
    ["Cash from operations (CFO)", (f) => m(f.cfo)],
    ["Capex", (f) => m(f.capex != null ? -Math.abs(f.capex) : null)],
    ["Free cash flow (CFO − Capex)", (f) => m(f.fcf), true],
    ["FCF margin", (f) => p(f.fcf != null && f.revenue ? (f.fcf / f.revenue) * 100 : null)],
    ["Net income", (f) => m(f.netIncome)],
  ];
  return (
    <section>
      <SectionTitle>Key financials</SectionTitle>
      <Card className="overflow-hidden">
        {loading ? (
          <Skeleton className="m-6 h-48" />
        ) : periods.length === 0 ? (
          <p className="px-6 py-8 text-[15px] text-ink-3">
            No financials found. {profile.notes ?? ""}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabular w-full min-w-[560px] text-[14px]">
              <thead className="border-b border-line text-[12px] text-ink-3">
                <tr>
                  <th className="py-3 pr-3 pl-6 text-left font-medium">
                    {ccy ?? ""} · {ccy === "INR" ? "₹ crore" : "millions"}
                  </th>
                  {periods.map((f) => (
                    <th
                      key={f.label + f.periodEnd}
                      className="px-3 py-3 text-right font-medium last:pr-6"
                    >
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, fn, strong]) => (
                  <tr key={label} className="border-b border-line/70 last:border-0">
                    <td
                      className={`py-2.5 pr-3 pl-6 ${strong ? "font-medium text-ink" : "text-ink-2"}`}
                    >
                      {label}
                    </td>
                    {periods.map((f) => (
                      <td
                        key={f.label + f.periodEnd}
                        className={`px-3 py-2.5 text-right last:pr-6 ${strong ? "font-medium" : ""}`}
                      >
                        {fn(f)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-[13px] text-ink-3">
        Researched by Claude from public filings
        {profile.researchedAt &&
          ` ${formatDistanceToNow(new Date(profile.researchedAt), { addSuffix: true })}`}
        . Check figures against the source documents before relying on them.
        {profile.notes && !profile.illustrative && <> Notes: {profile.notes}</>}
      </p>
    </section>
  );
}

function Memo({ profile, symbol }: { profile: CompanyProfile; symbol: string }) {
  const write = useWriteMemo();
  const running = isRunning(profile.memoStatus, profile.memoStartedAt) || write.isPending;
  const start = () =>
    write.mutate(symbol, {
      onSuccess: () => toast.message("Writing the memo", { description: "Usually 1–2 minutes." }),
      onError: (e) => toast.error("Couldn't start the memo", { description: e.message }),
    });
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <SectionTitle>Investment memo</SectionTitle>
        {profile.memo && !running && (
          <button
            type="button"
            onClick={start}
            className="mb-4 text-[14px] text-ink-3 underline underline-offset-2 hover:text-ink"
          >
            Rewrite
          </button>
        )}
      </div>
      <Card>
        <div className="px-6 py-7 sm:px-10 sm:py-10">
          {running ? (
            <p className="flex items-center gap-2 text-[15px] text-ink-2">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Claude is writing the memo
              from the research and your position…
            </p>
          ) : profile.memo ? (
            <>
              <div className="max-w-3xl">
                <Markdown>{profile.memo}</Markdown>
              </div>
              {profile.memoAt && (
                <p className="mt-8 text-[13px] text-ink-3">
                  Written {formatDistanceToNow(new Date(profile.memoAt), { addSuffix: true })}. Your
                  own analysis aid, not investment advice.
                </p>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="mx-auto max-w-lg text-[15px] text-ink-2">
                A structured memo on why you hold this: business, financials, valuation, moat, risks
                and a position view, written from the research above and your actual entry price and
                returns.
              </p>
              {profile.memoStatus === "error" && (
                <p className="mt-3 text-[14px] text-loss">
                  Last attempt failed: {profile.memoError}
                </p>
              )}
              <div className="mt-6 flex justify-center">
                <PillButton onClick={start}>
                  <Sparkles className="size-4" aria-hidden /> Write memo
                </PillButton>
              </div>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

function Sources({ profile }: { profile: CompanyProfile }) {
  if (!profile.sources.length) return null;
  return (
    <section>
      <SectionTitle>Sources</SectionTitle>
      <ul className="grid gap-x-8 gap-y-2 text-[14px] sm:grid-cols-2">
        {profile.sources.map((s) => (
          <li key={s.url} className="truncate">
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-ink-2 underline decoration-line underline-offset-2 hover:text-ink"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Trades({
  txns,
  ccy,
}: {
  symbol: string;
  txns: { date: string; side: string; quantity: number; price: number; amount: number | null }[];
  ccy: string;
}) {
  if (!txns.length) return null;
  return (
    <section>
      <SectionTitle>Trades</SectionTitle>
      <Card className="overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          <table className="tabular w-full text-[14px]">
            <thead className="sticky top-0 border-b border-line bg-surface text-[12px] text-ink-3">
              <tr>
                <th className="py-2.5 pr-3 pl-6 text-left font-medium">Date</th>
                <th className="px-3 text-left font-medium">Type</th>
                <th className="px-3 text-right font-medium">Units</th>
                <th className="py-2.5 pr-6 pl-3 text-right font-medium">Price / amount</th>
              </tr>
            </thead>
            <tbody>
              {[...txns].reverse().map((t, i) => (
                <tr key={i} className="border-b border-line/70 last:border-0">
                  <td className="py-2 pr-3 pl-6">{format(parseISO(t.date), "d MMM yyyy")}</td>
                  <td className="px-3 capitalize">{t.side}</td>
                  <td className="px-3 text-right">
                    {t.side === "dividend" ? "—" : qty(t.quantity)}
                  </td>
                  <td className="py-2 pr-6 pl-3 text-right">
                    {t.side === "dividend"
                      ? money(t.amount, ccy)
                      : t.side === "split"
                        ? "—"
                        : money(t.price, ccy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
