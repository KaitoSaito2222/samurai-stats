"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface DateNavigationProps {
  locale: string;
  dateStr: string;
  today: string;
  maxDate: string;
  displayDate: string;
  prevDate: string;
  nextDate: string;
}

export default function DateNavigation({
  locale,
  dateStr,
  today,
  maxDate,
  displayDate,
  prevDate,
  nextDate,
}: DateNavigationProps) {
  const t = useTranslations("games");
  const router = useRouter();
  const isToday = dateStr === today;
  // Next-day navigation stops at the look-ahead window.
  const atMax = dateStr >= maxDate;

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    router.push(`/${locale}/games?date=${val}`);
  }

  function handleBackToToday() {
    // Use explicit today date in URL to avoid any caching ambiguity.
    router.push(`/${locale}/games?date=${today}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-surface-border pb-4 gap-2">
        {/* Prev day */}
        <Link
          href={`/${locale}/games?date=${prevDate}`}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-navy hover:border-gold transition-colors font-sans text-sm uppercase tracking-wide"
        >
          ←
        </Link>

        {/* Date display — clicking opens native calendar */}
        <label className="relative flex-1 flex items-center justify-center gap-2 cursor-pointer group min-w-0">
          <h1 className="font-display text-lg sm:text-2xl font-bold text-navy text-center group-hover:text-gold-dark transition-colors truncate">
            {displayDate}
          </h1>
          <span className="flex-shrink-0 text-ink-muted group-hover:text-gold-dark transition-colors text-base">
            📅
          </span>
          {/* Hidden native date input — clicking the label triggers it */}
          <input
            type="date"
            value={dateStr}
            max={maxDate}
            onChange={handleDateChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            aria-label={t("pickDate")}
          />
        </label>

        {/* Next day — hidden at the end of the look-ahead window */}
        {atMax ? (
          <div className="flex-shrink-0 w-10" />
        ) : (
          <Link
            href={`/${locale}/games?date=${nextDate}`}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-navy hover:border-gold transition-colors font-sans text-sm uppercase tracking-wide"
          >
            →
          </Link>
        )}
      </div>

      {/* Back to today */}
      {!isToday && (
        <div className="text-center">
          <button
            onClick={handleBackToToday}
            className="font-sans text-sm uppercase tracking-wide text-gold-dark hover:text-navy transition-colors"
          >
            {t("backToToday")}
          </button>
        </div>
      )}
    </div>
  );
}
