import { getTranslations } from "next-intl/server";

interface GameDetailPageProps {
  params: { locale: string; id: string };
}

export default async function GameDetailPage(_props: GameDetailPageProps) {
  const t = await getTranslations("games");

  return (
    <div className="flex flex-col items-center justify-center py-20 bg-surface-card rounded-xl border border-surface-border text-center">
      <span className="text-5xl mb-4">⚾</span>
      <p className="text-slate-400 text-lg">{t("comingSoon")}</p>
    </div>
  );
}
