import { getTranslations } from "next-intl/server";

interface BillingPageProps {
  params: { locale: string };
}

export default async function BillingPage(_props: BillingPageProps) {
  const tPlan = await getTranslations("plan");
  const t = await getTranslations("billing");

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">{tPlan("upgrade")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Free plan */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">{tPlan("free")}</h2>
            <p className="text-3xl font-bold text-white mt-2">{t("freeBadge")}</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {t("featurePlayers")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {t("featureSummaryFree")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">✗</span>
              <span className="text-slate-500">{t("featureAnalysis")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">✗</span>
              <span className="text-slate-500">{t("featureGraphs")}</span>
            </li>
          </ul>
        </div>

        {/* Pro plan */}
        <div className="bg-surface-card border-2 border-pro rounded-xl p-6 space-y-4 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 bg-pro text-black text-xs font-bold rounded-full">
              {t("recommended")}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-pro">{tPlan("pro")}</h2>
            <p className="text-3xl font-bold text-white mt-2">
              $9.99<span className="text-base font-normal text-slate-400">{t("perMonth")}</span>
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {t("featureAll")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {t("featureSummaryPro")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {t("featureAnalysis")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {t("featureGraphs")}
            </li>
          </ul>
          <button
            disabled
            className="w-full py-3 bg-pro text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {t("comingSoon")}
          </button>
        </div>
      </div>
    </div>
  );
}
