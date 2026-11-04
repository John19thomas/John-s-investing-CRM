import { Link } from "react-router";
import { cn } from "@/lib/utils";

/** Four-colour tile mark: India, global, private, research. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-6 shrink-0 grid-cols-2 gap-[3px]", className)}>
      <span className="rounded-[3px] bg-[#ff7a1a]" />
      <span className="rounded-[3px] bg-[#3355ff]" />
      <span className="rounded-[3px] bg-[#12a26b]" />
      <span className="rounded-full bg-[#7b4dff]" />
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
      <span className="text-[17px] font-semibold tracking-tight">
        JT's{" "}
        <span className="font-normal text-ink-3">
          <span className="max-[420px]:hidden">investing </span>dashboard
        </span>
      </span>
    </Link>
  );
}
