import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="label-caps text-brand">{eyebrow}</p>
        <h1 className="font-display mt-4 text-[44px] sm:text-[84px]">{title}</h1>
        {description && (
          <div className="font-serif mt-5 max-w-2xl text-[19px] leading-snug text-ink-2 sm:text-[22px]">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-[6px] border border-line bg-surface", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
      <div>
        <h2 className="label-caps text-ink-2">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-ink-3">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Signed change with arrow + sign so direction never depends on colour alone. */
export function Delta({
  value,
  children,
  className,
}: {
  value: number | null;
  children: ReactNode;
  className?: string;
}) {
  if (value == null) return <span className={cn("text-ink-3", className)}>—</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", up ? "text-gain" : "text-loss", className)}
    >
      <Icon className="size-[1em] shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** Formats a number for display. (Kept as a component so callers don't change.) */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  return <>{format(value)}</>;
}

export function StatTile({
  label,
  value,
  sub,
  hero,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hero?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 p-5 sm:p-6", className)}>
      <span className="label-caps text-[11px] text-ink-3">{label}</span>
      <span
        className={cn(
          "mt-2 font-extrabold tracking-[-0.04em] break-words",
          hero
            ? "text-[40px] leading-none sm:text-[56px]"
            : "text-[22px] leading-tight sm:text-[32px]",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[13px]">{sub}</span>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-paper-2", className)} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-[6px] bg-paper-2 text-ink-2">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-medium tracking-tight">{title}</h3>
      <div className="mt-1.5 max-w-md text-[15px] text-ink-2">{body}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PillButton({
  children,
  variant = "solid",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "label-caps inline-flex items-center justify-center gap-2 rounded-[4px] px-5 py-3 transition-all disabled:pointer-events-none disabled:opacity-50",
        variant === "solid"
          ? "bg-ink text-paper hover:bg-brand"
          : "border border-white/25 bg-transparent text-ink hover:border-white/60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex gap-4", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "border-b-2 py-1 text-[13px] transition-colors",
            value === o.value
              ? "border-brand font-medium text-ink"
              : "border-transparent text-ink-3 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
