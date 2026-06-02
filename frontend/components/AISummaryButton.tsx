"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { generateAISummary } from "@/lib/api";
import axios from "axios";

interface AISummaryButtonProps {
  playerId: string;
  locale: string;
  userPlan: "free" | "pro";
  aiUsageToday: number;
  aiDailyLimit: number;
  remainingAi: number;
}

export default function AISummaryButton({
  playerId,
  locale,
  userPlan,
  aiUsageToday,
  aiDailyLimit,
  remainingAi,
}: AISummaryButtonProps) {
  const t = useTranslations("ai");
  const tPlayer = useTranslations("player");
  const tPlan = useTranslations("plan");

  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState(false);
  const [currentUsage, setCurrentUsage] = useState(aiUsageToday);

  const isFree = userPlan === "free";
  const freeLimit = 3;
  const currentRemaining = isFree
    ? freeLimit - currentUsage
    : remainingAi;
  const canGenerate = isFree ? currentRemaining > 0 : true;

  const handleGenerate = async () => {
    setLoading(true);
    setError(false);

    try {
      const res = await generateAISummary(playerId, locale as "ja" | "en");
      setSummary(res.data.summary);
      setCurrentUsage((prev) => prev + 1);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code;
        if (code === "LIMIT_EXCEEDED") {
          setLimitReached(true);
        } else {
          setError(true);
        }
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show summary result
  if (summary) {
    return (
      <div className="space-y-4">
        <div className="bg-surface-muted rounded p-4 font-serif text-ink leading-relaxed whitespace-pre-wrap border-l-4 border-gold">
          {summary}
        </div>
        {isFree && (
          <p className="font-sans text-xs text-ink-muted">
            {t("remaining", { count: Math.max(0, freeLimit - currentUsage) })}
          </p>
        )}
        <button
          onClick={() => { setSummary(null); setError(false); }}
          className="font-sans text-sm uppercase tracking-wide text-gold-dark hover:text-navy transition-colors"
        >
          {t("regenerate")}
        </button>
      </div>
    );
  }

  // Limit reached
  if (limitReached) {
    return (
      <div className="space-y-3">
        <p className="font-serif text-ink-muted text-sm">{t("limitReached")}</p>
        {isFree && (
          <Link
            href={`/${locale}/billing`}
            className="inline-block px-4 py-2 bg-gold hover:bg-gold-dark text-navy font-sans text-sm font-semibold uppercase tracking-wide rounded-lg transition-colors"
          >
            {tPlan("upgrade")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Usage indicator for Free users */}
      {isFree && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: freeLimit }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i < currentUsage ? "bg-surface-outline" : "bg-gold"
                }`}
              />
            ))}
          </div>
          <span className="font-sans text-xs text-ink-muted">
            {t("remaining", { count: Math.max(0, currentRemaining) })}
          </span>
        </div>
      )}

      {error && (
        <p className="font-sans text-error text-sm">
          {t("error")}
        </p>
      )}

      {canGenerate ? (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-dark disabled:opacity-60 disabled:cursor-not-allowed text-navy font-sans text-sm font-semibold uppercase tracking-wide rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {tPlayer("generating")}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t("generateSummary")}
            </>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="font-serif text-ink-muted text-sm">{t("limitReached")}</p>
          <Link
            href={`/${locale}/billing`}
            className="inline-block px-4 py-2 bg-gold hover:bg-gold-dark text-navy font-sans text-sm font-semibold uppercase tracking-wide rounded-lg transition-colors"
          >
            {tPlan("upgrade")}
          </Link>
        </div>
      )}
    </div>
  );
}
