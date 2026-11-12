import { formatDistanceToNow } from "date-fns";
import { Building2, LayoutGrid, Plus, Rows3 } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { NavLink, useParams } from "react-router";
import { toast } from "sonner";
import {
  Card,
  EmptyState,
  PageHeader,
  PillButton,
  SegmentedControl,
  Skeleton,
  StatTile,
} from "@/components/app/primitives";
import { SegmentedBar } from "@/components/charts/SegmentedBar";
import { CompanyForm } from "@/components/private/CompanyForm";
import { CompanyPanel } from "@/components/private/CompanyPanel";
import { CompanyLogo } from "@/components/holdings/CompanyLogo";
import { STATUS_COLOR, StatusDot } from "@/components/private/StatusDot";
import { thesisLead } from "@/components/private/Thesis";
import { useCompanies, useSetCompanyStatus } from "@/data/hooks";
import { useRepo } from "@/data/RepoContext";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type Company,
  type CompanyStatus,
  type Region,
} from "@/data/types";
import { moneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function PrivatePage() {
  const { base } = useRepo();
  const params = useParams();
  const region: Region = params["region"] === "india" ? "india" : "global";
  const companies = useCompanies(region);
  const [view, setView] = useState<"board" | "list">("board");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => companies.data ?? [], [companies.data]);
  const selected = list.find((c) => c.id === selectedId) ?? null;
  const ccy = region === "india" ? "INR" : "USD";
  const investedTotal = list
    .filter((c) => c.investedAmount != null && c.valuationCurrency === ccy)
    .reduce((a, c) => a + (c.investedAmount ?? 0), 0);
  const counts = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, list.filter((c) => c.status === s).length]),
  ) as Record<(typeof STATUS_ORDER)[number], number>;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        eyebrow="03 / Private"
        title="Private company tracker"
        description="Private companies you have invested in or are tracking. Upload analysis, notes and memos to each one; Claude summarises PDFs and text files."
        actions={
          <PillButton onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Add company
          </PillButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6">
          {(["global", "india"] as const).map((r) => (
            <NavLink
              key={r}
              to={`${base}/private/${r}`}
              className={({ isActive }) =>
                cn(
                  "border-b-2 py-1 text-[15px] transition-colors",
                  isActive
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-3 hover:text-ink",
                )
              }
            >
              {r === "global" ? "Global" : "India"}
            </NavLink>
          ))}
        </div>
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            {
              value: "board",
              label: (
                <span className="flex items-center gap-1.5">
                  <LayoutGrid className="size-3.5" aria-hidden /> Board
                </span>
              ),
            },
            {
              value: "list",
              label: (
                <span className="flex items-center gap-1.5">
                  <Rows3 className="size-3.5" aria-hidden /> List
                </span>
              ),
            },
          ]}
        />
      </div>

      {companies.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="size-5" />}
            title={`No ${region === "india" ? "India" : "global"} companies yet`}
            body="Add a company you've invested in or are looking at, then paste notes or upload its IC memo to build up context."
            action={
              <PillButton onClick={() => setAdding(true)}>
                <Plus className="size-4" aria-hidden /> Add company
              </PillButton>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="grid grid-cols-2 divide-line max-lg:[&>*:nth-child(-n+2)]:border-b lg:grid-cols-4 lg:divide-x">
            <StatTile
              label="Companies"
              value={list.length}
              sub={<span className="text-ink-3">in this book</span>}
            />
            <StatTile
              label="Invested in"
              value={counts.invested}
              sub={<span className="text-ink-3">portfolio companies</span>}
            />
            <StatTile
              label="Capital deployed"
              value={investedTotal ? moneyCompact(investedTotal, ccy) : "—"}
              sub={<span className="text-ink-3">at cost, {ccy}</span>}
            />
            <div className="col-span-2 border-t border-line p-5 sm:p-6 lg:col-span-1 lg:border-t-0">
              <span className="text-[13px] text-ink-3">Tracking and invested</span>
              <div className="mt-3">
                <SegmentedBar
                  segments={STATUS_ORDER.map((s) => ({
                    key: s,
                    label: STATUS_LABEL[s],
                    value: counts[s],
                    color: STATUS_COLOR[s],
                  }))}
                />
              </div>
            </div>
          </Card>

          {view === "board" ? (
            <Board companies={list} region={region} onOpen={setSelectedId} />
          ) : (
            <ListView companies={list} onOpen={setSelectedId} />
          )}
        </>
      )}

      <CompanyPanel company={selected} onClose={() => setSelectedId(null)} />
      <CompanyForm
        open={adding}
        onOpenChange={setAdding}
        region={region}
        onSaved={(c) => setSelectedId(c.id)}
      />
    </div>
  );
}

function Board({
  companies,
  region,
  onOpen,
}: {
  companies: Company[];
  region: Region;
  onOpen: (id: string) => void;
}) {
  const move = useSetCompanyStatus(region);
  const [active, setActive] = useState<Company | null>(null);
  // A short movement starts a drag, so a plain click still opens the company. On touch, press
  // and hold briefly so the board can still be scrolled with a swipe.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    // Space starts a keyboard drag; Enter is left free to open the company.
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const to = e.over?.id as CompanyStatus | undefined;
    const c = companies.find((x) => x.id === e.active.id);
    if (!c || !to || c.status === to) return;
    move.mutate(
      { id: c.id, status: to },
      {
        onSuccess: () => toast.success(`${c.name} moved to ${STATUS_LABEL[to]}`),
        onError: (err) => toast.error(`Couldn't move ${c.name}`, { description: err.message }),
      },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActive(companies.find((c) => c.id === e.active.id) ?? null)}
      onDragCancel={() => setActive(null)}
      onDragEnd={onDragEnd}
    >
      <p className="mb-4 hidden text-[13px] text-ink-3 md:block">
        Drag a company between columns to move it
      </p>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 md:overflow-visible">
        {STATUS_ORDER.map((s) => (
          <Column
            key={s}
            status={s}
            companies={companies.filter((c) => c.status === s)}
            onOpen={onOpen}
            dragging={!!active}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {active ? <CompanyCard c={active} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  companies,
  onOpen,
  dragging,
}: {
  status: CompanyStatus;
  companies: Company[];
  onOpen: (id: string) => void;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className="w-[82vw] shrink-0 snap-start sm:w-[320px] md:w-auto">
      <div className="label-caps mb-3 flex items-center gap-2 px-1">
        <StatusDot status={status} />
        {STATUS_LABEL[status]}
        <span className="tabular text-ink-3">{companies.length}</span>
      </div>
      <div
        className={cn(
          "min-h-[140px] space-y-3 rounded-[8px] p-1 transition-colors",
          dragging && "outline outline-1 outline-line outline-dashed",
          isOver && "bg-brand/[0.07] outline-brand/60",
        )}
      >
        {companies.map((c) => (
          <DraggableCard key={c.id} c={c} onOpen={onOpen} />
        ))}
        {companies.length === 0 && (
          <div className="rounded-[6px] border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-3">
            {dragging ? "Drop here" : "Nothing here yet"}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ c, onOpen }: { c: Company; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(c.id)}
      onKeyDown={(e) => {
        listeners?.["onKeyDown"]?.(e);
        if (e.key === "Enter") onOpen(c.id);
      }}
      aria-roledescription="draggable company"
      className={cn(
        "cursor-grab touch-manipulation select-none active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <CompanyCard c={c} />
    </div>
  );
}

function CompanyCard({ c, lifted }: { c: Company; lifted?: boolean }) {
  return (
    <div
      className={cn(
        "w-full rounded-[6px] border border-line bg-surface p-5 text-left transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-brand/50",
        lifted && "rotate-[1.5deg] border-brand/60 shadow-2xl",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo
            name={c.name}
            website={c.website?.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
            size={32}
          />
          <span className="truncate font-medium tracking-tight">{c.name}</span>
        </span>
        {c.stage && (
          <span className="shrink-0 rounded-sm bg-paper-2 px-1.5 py-0.5 text-[11px] text-ink-2">
            {c.stage}
          </span>
        )}
      </div>
      {c.sector && <div className="mt-0.5 text-[13px] text-ink-3">{c.sector}</div>}
      {c.thesis && (
        <p className="font-serif mt-3 line-clamp-3 text-[16px] leading-snug text-ink-2">
          {thesisLead(c.thesis)}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between text-[12px] text-ink-3">
        <span className="tabular">
          {c.lastValuation != null
            ? `${moneyCompact(c.lastValuation, c.valuationCurrency)} val.`
            : ""}
        </span>
        <span>{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}</span>
      </div>
    </div>
  );
}

function ListView({ companies, onOpen }: { companies: Company[]; onOpen: (id: string) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-[12px] text-ink-3">
            <tr>
              <th className="py-3 pr-3 pl-6 text-left font-medium">Company</th>
              <th className="px-3 text-left font-medium">Status</th>
              <th className="px-3 text-left font-medium">Sector</th>
              <th className="px-3 text-left font-medium">Stage</th>
              <th className="px-3 text-right font-medium">Valuation</th>
              <th className="px-3 text-right font-medium">My investment</th>
              <th className="py-3 pr-6 pl-3 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-paper-2/70"
              >
                <td className="py-3.5 pr-3 pl-6 font-medium tracking-tight">{c.name}</td>
                <td className="px-3">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot status={c.status} />
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-3 text-ink-2">{c.sector ?? "—"}</td>
                <td className="px-3 text-ink-2">{c.stage ?? "—"}</td>
                <td className="tabular px-3 text-right">
                  {c.lastValuation != null
                    ? moneyCompact(c.lastValuation, c.valuationCurrency)
                    : "—"}
                </td>
                <td className="tabular px-3 text-right">
                  {c.investedAmount != null
                    ? moneyCompact(c.investedAmount, c.valuationCurrency)
                    : "—"}
                </td>
                <td className="py-3.5 pr-6 pl-3 text-right text-ink-3">
                  {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {companies.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div className="min-w-0">
                <div className="font-medium">{c.name}</div>
                <div className="truncate text-[13px] text-ink-3">
                  {[c.sector, c.stage].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-[13px]">
                <StatusDot status={c.status} /> {STATUS_LABEL[c.status]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
