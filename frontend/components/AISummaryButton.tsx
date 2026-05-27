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
        <div className="bg-surface-border/40 rounded-lg p-4 text-slate-200 leading-relaxed whitespace-pre-wrap">
          {summary}
        </div>
        {isFree && (
          <p className="text-xs text-slate-500">
            {t("remaining", { count: Math.max(0, freeLimit - currentUsage) })}
          </p>
        )}
        <button
          onClick={() => { setSummary(null); setError(false); }}
          className="text-sm text-brand hover:underline"
        >
          {locale === "ja" ? "再生成する" : "Regenerate"}
        </button>
      </div>
    );
  }

  // Limit reached
  if (limitReached) {
    return (
      <div className="space-y-3">
        <p className="text-yellow-400 text-sm font-medium">{t("limitReached")}</p>
        {isFree && (
          <Link
            href={`/${locale}/billing`}
            className="inline-block px-4 py-2 bg-pro text-black text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
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
                  i < currentUsage ? "bg-surface-border" : "bg-brand"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400">
            {t("remaining", { count: Math.max(0, currentRemaining) })}
          </span>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">
          {locale === "ja" ? "エラーが発生しました。再度お試しください。" : "An error occurred. Please try again."}
        </p>
      )}

      {canGenerate ? (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
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
          <p className="text-slate-400 text-sm">{t("limitReached")}</p>
          <Link
            href={`/${locale}/billing`}
            className="inline-block px-4 py-2 bg-pro text-black text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            {tPlan("upgrade")}
          </Link>
        </div>
      )}
    </div>
  );
}
