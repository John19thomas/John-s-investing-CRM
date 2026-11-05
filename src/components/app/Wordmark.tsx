import { Link } from "react-router";
import { cn } from "@/lib/utils";

/** Tile mark in the site palette: mint and white on green. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-6 shrink-0 grid-cols-2 gap-[3px]", className)}>
      <span className="rounded-[3px] bg-[#5ef0b0]" />
      <span className="rounded-[3px] bg-white/80" />
      <span className="rounded-[3px] bg-white/35" />
      <span className="rounded-full bg-[#5ef0b0]/60" />
    </span>
  );
}

export function Wordmark({ to = "/", className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={cn("inline-flex items-center gap-2.5 whitespace-nowrap", className)}
      aria-label="JT's investing dashboard, home"
    >
      <BrandMark />
      <span className="text-[17px] font-medium tracking-tight">
        JT's{" "}
        <span className="font-light text-ink-3">
          <span className="max-[420px]:hidden">investing </span>dashboard
        </span>
      </span>
    </Link>
  );
}
