import { useState } from "react";
import { cn } from "@/lib/utils";

/** Company logo from its website's icon, falling back to a lettered tile. */
export function CompanyLogo({
  name,
  website,
  size = 40,
  className,
}: {
  name: string;
  website: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .replace(/[^A-Za-z0-9& ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const showImg = website && !failed;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-surface",
        !showImg && "bg-paper-2 font-semibold text-ink-2",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {showImg ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(website)}&sz=128`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="size-[72%] object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
