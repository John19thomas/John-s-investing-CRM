import { cn } from "@/lib/utils";

/**
 * Renders a thesis as a serif lead sentence followed by labelled paragraphs.
 * Plain text in, no markup needed: paragraphs are separated by a blank line, and a paragraph
 * that starts with a short "Label: " (e.g. "Why now: …") gets that label set as a small heading.
 */
export function Thesis({ text, compact }: { text: string; compact?: boolean }) {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const [lead, ...rest] = paras;
  if (!lead) return null;
  return (
    <div>
      <p
        className={cn(
          "font-serif text-ink",
          compact ? "text-[17px] leading-snug" : "text-[24px] leading-[1.25] sm:text-[28px]",
        )}
      >
        {lead}
      </p>
      {!compact && rest.length > 0 && (
        <dl className="mt-7 space-y-5 border-l border-brand/40 pl-5">
          {rest.map((p, i) => {
            const m = /^([A-Z][^:\n]{2,40}):\s+([\s\S]+)$/.exec(p);
            return m ? (
              <div key={i}>
                <dt className="label-caps text-[11px] text-brand">{m[1]}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{m[2]}</dd>
              </div>
            ) : (
              <p key={i} className="text-[15px] leading-relaxed text-ink-2">
                {p}
              </p>
            );
          })}
        </dl>
      )}
    </div>
  );
}

/** The lead sentence only, for cards and lists. */
export const thesisLead = (text: string | null) => text?.split(/\n\s*\n/)[0]?.trim() ?? null;

/** Bulleted text ("• a\n• b") as a numbered, hairline-separated list. */
export function RiskList({ text }: { text: string }) {
  const items = text
    .split("\n")
    .map((l) => l.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean);
  return (
    <ol className="divide-y divide-line/70">
      {items.map((r, i) => (
        <li key={i} className="flex gap-4 py-3 first:pt-0 last:pb-0">
          <span className="tabular label-caps w-5 shrink-0 pt-0.5 text-[11px] text-ink-3">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-[15px] leading-relaxed text-ink-2">{r}</span>
        </li>
      ))}
    </ol>
  );
}
