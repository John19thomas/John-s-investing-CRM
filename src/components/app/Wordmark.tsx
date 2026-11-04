import { Link } from "react-router";
import { cn } from "@/lib/utils";

export function Wordmark({
  to = "/",
  className,
  inverted,
}: {
  to?: string;
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Home"
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg font-display text-[17px] leading-none",
          inverted ? "bg-paper text-ink" : "bg-ink text-paper",
        )}
      >
        JT
      </span>
      <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">
        John Thomas
        <span
          className={cn(
            "ml-1.5 font-normal max-[380px]:hidden",
            inverted ? "text-paper/55" : "text-ink-3",
          )}
        >
          Portfolio
        </span>
      </span>
    </Link>
  );
}
