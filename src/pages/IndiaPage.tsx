import { formatDistanceToNow } from "date-fns";
import { FileUp, Link2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AnimatedNumber,
  Card,
  CardHeader,
  Delta,
  EmptyState,
  PageHeader,
  PillButton,
  SegmentedControl,
  Skeleton,
  StatTile,
} from "@/components/app/primitives";
import { ValueChart } from "@/components/charts/ValueChart";
import { WeightBars } from "@/components/charts/WeightBars";
import { CoverageNotice } from "@/components/holdings/CoverageNotice";
import { PortfolioSection } from "@/components/holdings/PortfolioSection";
import { bookXirr, statsBySymbol } from "@/components/holdings/positions";
import { summarize } from "@/components/holdings/summary";
import { TradebookDialog } from "@/components/holdings/TradebookDialog";
import { useHoldings, useKiteSync, useSnapshots, useTransactions } from "@/data/hooks";
import { invested, marketValue, type Holding } from "@/data/types";
import { money, moneyCompact, pct, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function IndiaPage() {
  const holdings = useHoldings("india");
  const snapshots = useSnapshots("india");
  const sync = useKiteSync();
  const txns = useTransactions("india");
  const [tradebookOpen, setTradebookOpen] = useState(false);

  const all = useMemo(() => holdings.data ?? [], [holdings.data]);
  const visible = all;
  const s = summarize(all, "INR");
  const stats = useMemo(() => statsBySymbol(all, txns.data ?? []), [all, txns.data]);
  const book = bookXirr(all, txns.data ?? [], stats);

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (r) => {
        if (r.status === "needs_login") {
          toast.message("Opening Zerodha to log in…", {
            description: "Kite sessions expire daily.",
          });
          window.location.href = r.loginUrl;
        } else toast.success(`Synced ${r.equityCount} stocks from Kite`);
      },
      onError: (e) => toast.error("Kite sync failed", { description: e.message }),
    });

  const syncButton = (
    <PillButton onClick={runSync} disabled={sync.isPending}>
      <RefreshCw className={cn("size-4", sync.isPending && "animate-spin")} aria-hidden />
      {sync.isPending ? "Syncing…" : "Sync Kite"}
    </PillButton>
  );

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        eyebrow="01 / India"
        title="India equities"
        description={
          s.lastSynced ? (
            <>
              Live from Zerodha Kite · last synced{" "}
              {formatDistanceToNow(new Date(s.lastSynced), { addSuffix: true })}
            </>
          ) : (
            "Stocks read directly from your Zerodha Kite account. Mutual funds and bonds are excluded."
          )
        }
        actions={syncButton}
      />

      {holdings.isLoading ? (
        <LoadingBlocks />
      ) : holdings.error ? (
        <Card>
          <EmptyState
            icon={<Link2 />}
            title="Couldn't load holdings"
            body={holdings.error.message}
          />
        </Card>
      ) : all.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Link2 className="size-5" />}
            title="Connect your Zerodha Kite account"
            body="You'll log in on Zerodha's own site. The dashboard only reads your holdings: it can never place or modify orders."
            action={syncButton}
          />
        </Card>
      ) : (
        <>
          <Card className="grid grid-cols-2 divide-line max-lg:[&>*:nth-child(-n+2)]:border-b lg:grid-cols-4 lg:divide-x">
            <StatTile
              hero
              className="col-span-2 lg:col-span-1"
              label="Current value"
              value={
                <AnimatedNumber
                  value={s.value ?? s.invested}
                  format={(n) => moneyCompact(n, "INR")}
                />
              }
              sub={
                <span className="tabular text-ink-3">
                  {money(s.value ?? s.invested, "INR", 0)} · {moneyCompact(s.invested, "INR")}{" "}
                  invested
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
                book.xirr != null ? (
                  <span className="text-ink-3">Annualised, all trades</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTradebookOpen(true)}
                    className="text-left text-ink-3 underline underline-offset-2 hover:text-ink"
                  >
                    {book.covered ? `Trades cover ${book.covered} of ${book.total}. ` : ""}Import
                    tradebook
                  </button>
                )
              }
            />
            <StatTile
              label="Total P&L"
              value={<Delta value={s.pnl}>{signedMoney(s.pnl, "INR", true)}</Delta>}
              sub={<Delta value={s.pnlPct}>{pct(s.pnlPct)} all time</Delta>}
            />
            <StatTile
              className="col-span-2 border-t border-line lg:col-span-1 lg:border-t-0"
              label="Today"
              value={<Delta value={s.dayChange}>{signedMoney(s.dayChange, "INR", true)}</Delta>}
              sub={<Delta value={s.dayChangePct}>{pct(s.dayChangePct)} vs yesterday's close</Delta>}
            />
          </Card>

          <PortfolioSection
            title="Companies"
            holdings={visible}
            stats={stats}
            bookXirr={book.xirr}
            notice={
              <CoverageNotice
                holdings={visible}
                txns={txns.data ?? []}
                stats={stats}
                hint="Download a tradebook for each earlier year from Zerodha Console (Reports → Tradebook) and import them all; duplicates are skipped."
                onImport={() => setTradebookOpen(true)}
                importLabel="Import older tradebooks"
              />
            }
            controls={
              <>
                <button
                  type="button"
                  onClick={() => setTradebookOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 underline decoration-line underline-offset-4 hover:text-ink"
                >
                  <FileUp className="size-3.5" aria-hidden /> Import tradebook
                </button>
              </>
            }
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Portfolio value" sub="Market value against money invested" />
              {snapshots.isLoading ? (
                <Skeleton className="m-6 h-[260px]" />
              ) : (
                <ValueChart data={snapshots.data ?? []} currency="INR" />
              )}
            </Card>
            <Card>
              <CardHeader title="Allocation" sub="Share of portfolio value" />
              <WeightBars
                rows={all.map((h) => ({
                  key: h.id,
                  label: h.symbol,
                  value: marketValue(h) ?? invested(h),
                }))}
                format={(n) => moneyCompact(n, "INR")}
              />
            </Card>
          </div>

          <Movers holdings={all.filter((h) => h.source === "kite")} />
        </>
      )}
      <TradebookDialog open={tradebookOpen} onOpenChange={setTradebookOpen} holdings={all} />
    </div>
  );
}

function Movers({ holdings }: { holdings: Holding[] }) {
  const withDay = holdings.filter((h) => h.dayChangePct != null);
  if (withDay.length < 4) return null;
  const sorted = [...withDay].sort((a, b) => (b.dayChangePct ?? 0) - (a.dayChangePct ?? 0));
  const groups = [
    { title: "Top gainers today", rows: sorted.slice(0, 3) },
    { title: "Top losers today", rows: sorted.slice(-3).reverse() },
  ];
  const max = Math.max(...withDay.map((h) => Math.abs(h.dayChangePct ?? 0)), 0.01);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groups.map((g) => (
        <Card key={g.title}>
          <CardHeader title={g.title} />
          <ul className="space-y-3 px-5 pt-3 pb-5 sm:px-6">
            {g.rows.map((h) => {
              const d = h.dayChangePct ?? 0;
              return (
                <li
                  key={h.id}
                  className="grid grid-cols-[96px_1fr_72px] items-center gap-3 text-[13px]"
                >
                  <span className="truncate font-semibold">{h.symbol}</span>
                  <div className="h-2 rounded-full bg-paper-2">
                    <div
                      className={cn("h-2 rounded-full", d >= 0 ? "bg-gain" : "bg-loss")}
                      style={{ width: `${(Math.abs(d) / max) * 100}%` }}
                    />
                  </div>
                  <span className="tabular text-right">
                    <Delta value={d}>{pct(d)}</Delta>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function LoadingBlocks() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[132px]" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[360px] lg:col-span-2" />
        <Skeleton className="h-[360px]" />
      </div>
      <Skeleton className="h-[420px]" />
    </div>
  );
}
