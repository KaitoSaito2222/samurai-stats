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
      <h1 className="text-2xl font-bold text-slate-900">{tPlan("upgrade")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Free plan */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{tPlan("free")}</h2>
            <p className="text-3xl font-bold text-slate-900 mt-2">{t("freeBadge")}</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              {t("featurePlayers")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              {t("featureSummaryFree")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-300 mt-0.5">✗</span>
              <span className="text-slate-400">{t("featureAnalysis")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-300 mt-0.5">✗</span>
              <span className="text-slate-400">{t("featureGraphs")}</span>
            </li>
          </ul>
        </div>

        {/* Pro plan */}
        <div className="bg-surface-card border-2 border-pro rounded-xl p-6 space-y-4 relative shadow-sm">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 bg-pro text-white text-xs font-bold rounded-full shadow-sm">
              {t("recommended")}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-pro">{tPlan("pro")}</h2>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              $9.99<span className="text-base font-normal text-slate-500">{t("perMonth")}</span>
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              {t("featureAll")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              {t("featureSummaryPro")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              {t("featureAnalysis")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              {t("featureGraphs")}
            </li>
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading ? t("redirecting") : t("upgradeButton")}
          </button>
          <button
            onClick={handleManage}
            disabled={portalLoading}
            className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            {t("manageSubscription")}
          </button>
        </div>
      </div>
    </div>
  );
}
