import { getTranslations } from "next-intl/server";

interface SearchPageProps {
  params: { locale: string };
}

export default async function SearchPage({ params: { locale: _locale } }: SearchPageProps) {
  const t = await getTranslations("players");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t("search")}</h1>
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card rounded-xl border border-surface-border text-center">
        <span className="text-5xl mb-4">🔍</span>
        <p className="text-slate-400 text-lg">
          {_locale === "ja" ? "全MLB選手検索機能は準備中です" : "Full MLB player search coming soon"}
        </p>
      </div>
    </div>
  );
}
