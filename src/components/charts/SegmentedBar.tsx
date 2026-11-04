import { pct } from "@/lib/format";

export type Segment = {
  key: string;
  label: string;
  value: number;
  color: string;
  display?: string;
};

/** One whole split into parts: thin bar + legend listing names in block order. */
export function SegmentedBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const parts = segments.filter((s) => s.value > 0);
  if (!total) return null;
  return (
    <div>
      <div
        className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={parts
          .map((s) => `${s.label} ${pct((s.value / total) * 100, 0, false)}`)
          .join(", ")}
      >
        {parts.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${s.display ?? s.value} (${pct((s.value / total) * 100, 1, false)})`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
        {parts.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="text-ink-2">{s.label}</span>
            <span className="tabular text-ink-3">{pct((s.value / total) * 100, 0, false)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
