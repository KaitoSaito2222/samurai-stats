import { getTranslations } from "next-intl/server";

interface BillingPageProps {
  params: { locale: string };
}

export default async function BillingPage({ params: { locale: _locale } }: BillingPageProps) {
  const t = await getTranslations("plan");

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">{t("upgrade")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Free plan */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">{t("free")}</h2>
            <p className="text-3xl font-bold text-white mt-2">
              {_locale === "ja" ? "無料" : "Free"}
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {_locale === "ja" ? "選手一覧・詳細" : "Player list & detail"}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {_locale === "ja" ? "AI要約 3回/日" : "AI summary 3x/day"}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">✗</span>
              <span className="text-slate-500">
                {_locale === "ja" ? "詳細AI分析（Claude）" : "Detailed AI analysis (Claude)"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">✗</span>
              <span className="text-slate-500">
                {_locale === "ja" ? "成績グラフ" : "Stats graphs"}
              </span>
            </li>
          </ul>
        </div>

        {/* Pro plan */}
        <div className="bg-surface-card border-2 border-pro rounded-xl p-6 space-y-4 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 bg-pro text-black text-xs font-bold rounded-full">
              {_locale === "ja" ? "おすすめ" : "Recommended"}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-pro">{t("pro")}</h2>
            <p className="text-3xl font-bold text-white mt-2">
              $9.99<span className="text-base font-normal text-slate-400">/{_locale === "ja" ? "月" : "mo"}</span>
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {_locale === "ja" ? "全機能含む" : "Everything in Free"}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {_locale === "ja" ? "AI要約 100回/日" : "AI summary 100x/day"}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {_locale === "ja" ? "詳細AI分析（Claude）" : "Detailed AI analysis (Claude)"}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              {_locale === "ja" ? "成績グラフ" : "Stats graphs"}
            </li>
          </ul>
          <button
            disabled
            className="w-full py-3 bg-pro text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {_locale === "ja" ? "準備中" : "Coming soon"}
          </button>
        </div>
      </div>
    </div>
  );
}
