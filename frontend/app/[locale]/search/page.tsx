import { getTranslations } from "next-intl/server";

interface SearchPageProps {
  params: { locale: string };
}

export default async function SearchPage(_props: SearchPageProps) {
  const tNav = await getTranslations("nav");
  const t = await getTranslations("pages.search");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{tNav("search")}</h1>
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card rounded-xl border border-surface-border text-center">
        <span className="text-5xl mb-4">🔍</span>
        <p className="text-slate-400 text-lg">{t("comingSoon")}</p>
      </div>
    </div>
  );
}
