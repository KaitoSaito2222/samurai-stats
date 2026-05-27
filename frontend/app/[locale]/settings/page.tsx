import { getTranslations } from "next-intl/server";

interface SettingsPageProps {
  params: { locale: string };
}

export default async function SettingsPage({ params: { locale: _locale } }: SettingsPageProps) {
  const _t = await getTranslations("nav");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">
        {_locale === "ja" ? "設定" : "Settings"}
      </h1>
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card rounded-xl border border-surface-border text-center">
        <span className="text-5xl mb-4">⚙️</span>
        <p className="text-slate-400 text-lg">
          {_locale === "ja" ? "設定機能は準備中です" : "Settings coming soon"}
        </p>
      </div>
    </div>
  );
}
