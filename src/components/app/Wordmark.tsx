import { Link } from "react-router";
import { cn } from "@/lib/utils";

export function Wordmark({ to = "/", className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={cn("inline-flex items-baseline gap-2 whitespace-nowrap", className)}
      aria-label="Home"
    >
      <span className="text-[17px] font-semibold tracking-tight">John Thomas</span>
      <span className="text-[15px] text-ink-3 max-[420px]:hidden">Investments</span>
    </Link>
  );
}
