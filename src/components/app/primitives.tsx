import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
        <p className="text-xs font-medium tracking-[0.14em] text-ink-3 uppercase">{eyebrow}</p>
        <h1 className="font-display mt-2 text-[40px] leading-[1.02] sm:text-[56px]">{title}</h1>
        {description && <div className="mt-3 max-w-2xl text-[15px] text-ink-2">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface", className)}>
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
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
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

/** Counts up to a number the first time it scrolls into view. */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [text, setText] = useState(format(reduce ? value : 0));
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setText(format(value));
      return;
    }
    const controls = animate(mv, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setText(format(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce, format, mv]);
  return <span ref={ref}>{text}</span>;
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
      <span className="text-[13px] text-ink-3">{label}</span>
      <span
        className={cn(
          "truncate font-semibold tracking-tight",
          hero
            ? "text-[40px] leading-none sm:text-[52px]"
            : "text-2xl leading-tight sm:text-[28px]",
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
      <div className="grid size-12 place-items-center rounded-2xl bg-paper-2 text-ink-2">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
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
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
        variant === "solid"
          ? "bg-ink text-paper hover:opacity-85"
          : "border border-line bg-surface text-ink hover:bg-paper-2",
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
    <div
      className={cn("inline-flex rounded-full border border-line bg-surface p-1", className)}
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            value === o.value ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
