import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface SettingsPageProps {
  params: { locale: string };
}

export default async function SettingsPage({ params: { locale } }: SettingsPageProps) {
  const t = await getTranslations("pages.settings");
  const tPlan = await getTranslations("plan");
  const tBilling = await getTranslations("billing");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      {/* Plan section */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">{tPlan("free")}</h2>
        <p className="text-sm text-slate-500">{t("planDescription")}</p>
        <Link
          href={`/${locale}/billing`}
          className="inline-block px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-medium rounded-xl transition-colors shadow-sm text-sm"
        >
          {tPlan("upgrade")}
        </Link>
      </div>

      {/* Language section */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">{t("language")}</h2>
        <div className="flex gap-3">
          <Link
            href="/ja/settings"
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              locale === "ja"
                ? "bg-brand text-white border-brand"
                : "bg-surface-card border-surface-border text-slate-700 hover:border-brand hover:text-brand"
            }`}
          >
            日本語
          </Link>
          <Link
            href="/en/settings"
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              locale === "en"
                ? "bg-brand text-white border-brand"
                : "bg-surface-card border-surface-border text-slate-700 hover:border-brand hover:text-brand"
            }`}
          >
            English
          </Link>
        </div>
      </div>

      {/* Subscription management */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">{t("subscription")}</h2>
        <p className="text-sm text-slate-500">{t("subscriptionDescription")}</p>
        <Link
          href={`/${locale}/billing`}
          className="inline-block px-5 py-2.5 border border-surface-border text-slate-700 hover:border-brand hover:text-brand font-medium rounded-xl transition-colors text-sm"
        >
          {tBilling("manageSubscription")}
        </Link>
      </div>
    </div>
  );
}
