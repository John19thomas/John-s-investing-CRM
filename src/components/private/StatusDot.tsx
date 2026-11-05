import type { CompanyStatus } from "@/data/types";
import { cn } from "@/lib/utils";

// Pipeline stage identity (categorical slots, fixed order) — always shown with its label.
export const STATUS_COLOR: Record<CompanyStatus, string> = {
  watching: "var(--series-2)",
  invested: "var(--series-1)",
};

export function StatusDot({ status, className }: { status: CompanyStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ background: STATUS_COLOR[status] }}
    />
  );
}
