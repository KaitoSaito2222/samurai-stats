"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export default function AiRemainingBanner() {
  const t = useTranslations("ai");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleAiRemaining = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      const count = customEvent.detail;
      // Only show banner when fewer than 10 calls remain (Pro users near daily limit)
      if (count < 10) {
        setRemaining(count);
        setVisible(true);
      }
    };

    window.addEventListener("ai-remaining", handleAiRemaining);
    return () => {
      window.removeEventListener("ai-remaining", handleAiRemaining);
    };
  }, []);

  const dismiss = () => setVisible(false);

  if (!visible || remaining === null) return null;

  return (
    <div
      role="alert"
      className="sticky top-14 z-40 bg-pro/10 border-b border-pro/30 px-4 py-2"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-pro flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-pro font-medium">
            {t("remaining", { count: remaining })}
          </span>
        </div>
        <button
          onClick={dismiss}
          className="text-pro/70 hover:text-pro transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
