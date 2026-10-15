import Image from "next/image";

/**
 * Team crest. The SVGs are vendored into /public/logos by the scraper so the
 * site never depends on cdn.nba.com at runtime.
 */
export function TeamLogo({
  abbr,
  size = 28,
  className = "",
  priority = false,
}: {
  abbr: string;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={`/logos/${abbr.toLowerCase()}.svg`}
      alt={abbr}
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
