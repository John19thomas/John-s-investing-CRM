import { formatDistanceToNow } from "date-fns";
import { Globe2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AnimatedNumber,
  Card,
  CardHeader,
  Delta,
  EmptyState,
  PageHeader,
  PillButton,
  Skeleton,
  StatTile,
} from "@/components/app/primitives";
import { SegmentedBar } from "@/components/charts/SegmentedBar";
import { ValueChart } from "@/components/charts/ValueChart";
import { WeightBars } from "@/components/charts/WeightBars";
import { CoverageNotice } from "@/components/holdings/CoverageNotice";
import { LiveBadge } from "@/components/holdings/LiveBadge";
import { PortfolioSection } from "@/components/holdings/PortfolioSection";
import { bookXirr, statsBySymbol } from "@/components/holdings/positions";
import { primaryCurrency, summarize } from "@/components/holdings/summary";
import { ImportDialog } from "@/components/revolut/ImportDialog";
import { useHoldings, useSnapshots, useTransactions } from "@/data/hooks";
import { invested, marketValue } from "@/data/types";
import { money, moneyCompact, pct, signedMoney } from "@/lib/format";
import { LoadingBlocks } from "./IndiaPage";

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

export default function RevolutPage() {
  const holdings = useHoldings("revolut");
  const snapshots = useSnapshots("revolut");
  const [open, setOpen] = useState(false);

  const txns = useTransactions("revolut");
  const all = useMemo(() => holdings.data ?? [], [holdings.data]);
  const stats = useMemo(() => statsBySymbol(all, txns.data ?? []), [all, txns.data]);
  const book = bookXirr(all, txns.data ?? [], stats);
  const ccy = primaryCurrency(all, "USD");
  const s = summarize(all, ccy);
  const otherCcys = [...new Set(all.map((h) => h.currency))].filter((c) => c !== ccy);

  // Currency mix by cost basis (at most four currencies shown, the rest folded).
  const byCcy = new Map<string, number>();
  for (const h of all) byCcy.set(h.currency, (byCcy.get(h.currency) ?? 0) + invested(h));

  const importButton = (
    <PillButton onClick={() => setOpen(true)}>
      <Upload className="size-4" aria-hidden /> Import CSV
    </PillButton>
  );

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        eyebrow="02 / Global"
        title="Global equities"
        description={
          s.lastSynced ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>
                Held at Revolut · last imported{" "}
                {formatDistanceToNow(new Date(s.lastSynced), { addSuffix: true })}
              </span>
              <LiveBadge scope="revolut" holdings={all} />
            </div>
          ) : (
            "US and European stocks held at Revolut, refreshed whenever you upload a new statement."
          )
        }
        actions={importButton}
      />

      {holdings.isLoading ? (
        <LoadingBlocks />
      ) : all.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Globe2 className="size-5" />}
            title="Import your Revolut holdings"
            body="Export your stocks account statement from the Revolut app as CSV and drop it in. You'll see a preview before anything is saved."
            action={importButton}
          />
        </Card>
      ) : (
        <>
          <Card className="grid grid-cols-2 divide-line max-lg:[&>*:nth-child(-n+2)]:border-b lg:grid-cols-4 lg:divide-x">
            <StatTile
              hero
              className="col-span-2 lg:col-span-1"
              label={s.value != null ? "Market value" : "Cost basis"}
              value={
                <AnimatedNumber
                  value={s.value ?? s.invested}
                  format={(n) => moneyCompact(n, ccy)}
                />
              }
              sub={
                <span className="tabular text-ink-3">
                  {money(s.value ?? s.invested, ccy, 0)}
                  {otherCcys.length > 0 && ` + ${otherCcys.join(", ")} holdings`}
                </span>
              }
            />
            <StatTile
              label="XIRR"
              value={
                book.xirr != null ? (
                  <Delta value={book.xirr}>{pct(book.xirr * 100, 1)}</Delta>
                ) : (
                  <span className="text-ink-3">—</span>
                )
              }
              sub={
                <span className="text-ink-3">
                  {book.xirr != null
                    ? `Annualised · ${moneyCompact(s.invested, ccy)} invested`
                    : book.covered
                      ? `Trades cover ${book.covered} of ${book.total}`
                      : "Import a full statement to see this"}
                </span>
              }
            />
            <StatTile
              label="Unrealised P&L"
              value={<Delta value={s.pnl}>{signedMoney(s.pnl, ccy, true)}</Delta>}
              sub={
                s.value == null ? (
                  <span className="text-ink-3">Waiting for live prices</span>
                ) : (
                  <Delta value={s.pnlPct}>{pct(s.pnlPct)} all time</Delta>
                )
              }
            />
            <div className="col-span-2 border-t border-line p-5 sm:p-6 lg:col-span-1 lg:border-t-0">
              <span className="text-[13px] text-ink-3">Currency mix</span>
              <div className="mt-3">
                <SegmentedBar
                  segments={[...byCcy.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([c, v], i) => ({ key: c, label: c, value: v, color: SERIES[i]! }))}
                />
              </div>
            </div>
          </Card>

          <PortfolioSection
            title="Companies"
            holdings={all}
            stats={stats}
            bookXirr={book.xirr}
            notice={
              <CoverageNotice
                holdings={all}
                txns={txns.data ?? []}
                stats={stats}
                hint="Re-import a Revolut statement that starts from your first trade."
                onImport={() => setOpen(true)}
                importLabel="Import statement"
              />
            }
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Portfolio value" sub="Recorded each time you import" />
              {snapshots.isLoading ? (
                <Skeleton className="m-6 h-[260px]" />
              ) : (
                <ValueChart data={snapshots.data ?? []} currency={ccy} />
              )}
            </Card>
            <Card>
              <CardHeader title="Allocation" sub="Share of portfolio" />
              <WeightBars
                rows={all.map((h) => ({
                  key: h.id,
                  label: h.symbol,
                  sub: h.name ?? undefined,
                  value: marketValue(h) ?? invested(h),
                }))}
                format={(n) => moneyCompact(n, ccy)}
              />
            </Card>
          </div>
        </>
      )}

      <ImportDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
