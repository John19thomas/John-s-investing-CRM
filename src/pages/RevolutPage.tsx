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
import { HoldingsTable } from "@/components/holdings/HoldingsTable";
import { primaryCurrency, summarize } from "@/components/holdings/summary";
import { ImportDialog } from "@/components/revolut/ImportDialog";
import { useHoldings, useSnapshots } from "@/data/hooks";
import { invested, marketValue } from "@/data/types";
import { money, moneyCompact, pct, signedMoney } from "@/lib/format";
import { LoadingBlocks } from "./IndiaPage";

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

export default function RevolutPage() {
  const holdings = useHoldings("revolut");
  const snapshots = useSnapshots("revolut");
  const [open, setOpen] = useState(false);

  const all = useMemo(() => holdings.data ?? [], [holdings.data]);
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
        eyebrow="02 · Public markets · Global"
        title={
          <>
            Global <em className="text-ink-3">equities</em>
          </>
        }
        description={
          s.lastSynced ? (
            <>
              Held at Revolut · last imported{" "}
              {formatDistanceToNow(new Date(s.lastSynced), { addSuffix: true })}
            </>
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
              label="Cost basis"
              value={moneyCompact(s.invested, ccy)}
              sub={<span className="text-ink-3">{s.count} positions</span>}
            />
            <StatTile
              label="Unrealised P&L"
              value={<Delta value={s.pnl}>{signedMoney(s.pnl, ccy, true)}</Delta>}
              sub={
                s.value == null ? (
                  <span className="text-ink-3">Needs current prices in the CSV</span>
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

          <Card>
            <CardHeader title="Holdings" sub={`${all.length} positions`} />
            <div className="mt-3">
              <HoldingsTable holdings={all} showDay={false} />
            </div>
          </Card>
        </>
      )}

      <ImportDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
