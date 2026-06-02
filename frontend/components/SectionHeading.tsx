import type { ReactNode } from "react";

interface SectionHeadingProps {
  /** Small gold uppercase kicker label shown above the title. */
  kicker?: string;
  /** Main Playfair headline. */
  title: string;
  /** Optional right-aligned action (e.g. a "view all" link). */
  action?: ReactNode;
}

/**
 * Editorial section heading: optional gold kicker + Playfair title,
 * underlined with a gold rule. Matches the "Bushido Data Light" system.
 */
export default function SectionHeading({ kicker, title, action }: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 border-b border-surface-border pb-3">
      <div>
        {kicker && (
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark mb-1">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-2xl sm:text-[28px] font-bold text-navy leading-tight">
          {title}
        </h2>
      </div>
      {action && <div className="flex-shrink-0 pb-1">{action}</div>}
    </div>
  );
}
