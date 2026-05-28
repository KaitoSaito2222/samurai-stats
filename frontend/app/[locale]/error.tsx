"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const t = useTranslations("errors");
  const router = useRouter();

  useEffect(() => {
    // Log error in development only
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 space-y-6">
      <div className="text-6xl">⚾</div>
      <h2 className="text-2xl font-bold text-slate-900">{t("serverError")}</h2>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-lg transition-colors"
        >
          {t("retry")}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-surface-card hover:bg-surface-muted text-slate-700 font-semibold rounded-lg transition-colors border border-surface-border shadow-sm"
        >
          Back
        </button>
      </div>
    </div>
  );
}
