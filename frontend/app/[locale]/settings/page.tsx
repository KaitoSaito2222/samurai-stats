import { getTranslations } from "next-intl/server";

interface SettingsPageProps {
  params: { locale: string };
}

export default async function SettingsPage(_props: SettingsPageProps) {
  const t = await getTranslations("pages.settings");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card rounded-xl border border-surface-border text-center">
        <span className="text-5xl mb-4">⚙️</span>
        <p className="text-slate-400 text-lg">{t("comingSoon")}</p>
      </div>
    </div>
  );
}
