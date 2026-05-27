import { getTranslations } from "next-intl/server";

interface RankingsPageProps {
  params: { locale: string };
}

export default async function RankingsPage({ params: { locale: _locale } }: RankingsPageProps) {
  const t = await getTranslations("nav");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t("rankings")}</h1>
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card rounded-xl border border-surface-border text-center">
        <span className="text-5xl mb-4">🏆</span>
        <p className="text-slate-400 text-lg">
          {_locale === "ja" ? "ランキング機能は準備中です" : "Rankings coming soon"}
        </p>
      </div>
    </div>
  );
}
