import { formatDistanceToNow } from "date-fns";
import { Link2, RefreshCw } from "lucide-react";
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
import { HoldingsTable } from "@/components/holdings/HoldingsTable";
import { summarize } from "@/components/holdings/summary";
import { useHoldings, useKiteSync, useSnapshots } from "@/data/hooks";
import { invested, marketValue, type Holding } from "@/data/types";
import { money, moneyCompact, pct, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "kite" | "kite_mf";

export default function IndiaPage() {
  const holdings = useHoldings("india");
  const snapshots = useSnapshots("india");
  const sync = useKiteSync();
  const [filter, setFilter] = useState<Filter>("all");

  const all = useMemo(() => holdings.data ?? [], [holdings.data]);
  const visible = filter === "all" ? all : all.filter((h) => h.source === filter);
  const s = summarize(all, "INR");

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (r) => {
        if (r.status === "needs_login") {
          toast.message("Opening Zerodha to log in…", {
            description: "Kite sessions expire daily.",
          });
          window.location.href = r.loginUrl;
        } else toast.success(`Synced ${r.equityCount} stocks and ${r.mfCount} funds from Kite`);
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
        eyebrow="01 · Public markets · India"
        title={
          <>
            India <em className="text-ink-3">equities</em>
          </>
        }
        description={
          s.lastSynced ? (
            <>
              Live from Zerodha Kite · last synced{" "}
              {formatDistanceToNow(new Date(s.lastSynced), { addSuffix: true })}
            </>
          ) : (
            "Stocks and mutual funds, read directly from your Zerodha Kite account."
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
                <span className="tabular text-ink-3">{money(s.value ?? s.invested, "INR", 0)}</span>
              }
            />
            <StatTile
              label="Invested"
              value={moneyCompact(s.invested, "INR")}
              sub={<span className="text-ink-3">{s.count} positions</span>}
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

          <Card>
            <CardHeader
              title="Holdings"
              sub={`${visible.length} of ${all.length}`}
              right={
                <SegmentedControl
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "kite", label: "Stocks" },
                    { value: "kite_mf", label: "Funds" },
                  ]}
                />
              }
            />
            <div className="mt-3">
              <HoldingsTable holdings={visible} />
            </div>
          </Card>
        </>
      )}
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
