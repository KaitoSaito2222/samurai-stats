"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createCheckout, createPortal } from "@/lib/api";

export default function BillingPage() {
  const t = useTranslations("billing");
  const tPlan = useTranslations("plan");
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await createCheckout();
      window.location.href = res.data.url;
    } catch {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const res = await createPortal();
      window.location.href = res.data.url;
    } catch {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="border-b border-surface-border pb-3">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark mb-1">Membership</p>
        <h1 className="font-display text-2xl sm:text-[28px] font-bold text-navy leading-tight">{tPlan("upgrade")}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Free plan */}
        <div className="bg-surface-card border border-surface-border rounded p-6 space-y-4">
          <div>
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">{tPlan("free")}</h2>
            <p className="font-display text-3xl font-bold text-navy mt-2">{t("freeBadge")}</p>
          </div>
          <ul className="space-y-2 font-serif text-sm text-ink">
            <li className="flex items-start gap-2">
              <span className="text-gold-dark mt-0.5">✓</span>
              {t("featurePlayers")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-dark mt-0.5">✓</span>
              {t("featureSummaryFree")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-surface-outline mt-0.5">✗</span>
              <span className="text-ink-muted/60">{t("featureAnalysis")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-surface-outline mt-0.5">✗</span>
              <span className="text-ink-muted/60">{t("featureGraphs")}</span>
            </li>
          </ul>
        </div>

        {/* Pro plan */}
        <div className="bg-surface-card border-2 border-gold rounded p-6 space-y-4 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 bg-gold text-navy text-xs font-bold uppercase tracking-wide rounded-lg">
              {t("recommended")}
            </span>
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-gold-dark">{tPlan("pro")}</h2>
            <p className="font-display text-3xl font-bold text-navy mt-2">
              $9.99<span className="font-sans text-base font-normal text-ink-muted">{t("perMonth")}</span>
            </p>
          </div>
          <ul className="space-y-2 font-serif text-sm text-ink">
            <li className="flex items-start gap-2">
              <span className="text-gold-dark mt-0.5">✓</span>
              {t("featureAll")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-dark mt-0.5">✓</span>
              {t("featureSummaryPro")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-dark mt-0.5">✓</span>
              {t("featureAnalysis")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-dark mt-0.5">✓</span>
              {t("featureGraphs")}
            </li>
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 bg-gold hover:bg-gold-dark text-navy font-sans font-semibold uppercase tracking-wide rounded-lg disabled:opacity-60 transition-colors"
          >
            {loading ? t("redirecting") : t("upgradeButton")}
          </button>
          <button
            onClick={handleManage}
            disabled={portalLoading}
            className="w-full py-2 font-sans text-sm uppercase tracking-wide text-ink-muted hover:text-navy transition-colors"
          >
            {t("manageSubscription")}
          </button>
        </div>
      </div>
    </div>
  );
}
