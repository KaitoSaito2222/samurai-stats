import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

interface SettingsPageProps {
  params: { locale: string };
}

export default async function SettingsPage({ params: { locale } }: SettingsPageProps) {
  // Double-check auth server-side (middleware is the primary gate)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read-only in RSC — no-op
        },
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/${locale}/login?redirectTo=/${locale}/settings`);
  }

  const t = await getTranslations("pages.settings");
  const tPlan = await getTranslations("plan");
  const tBilling = await getTranslations("billing");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      {/* Plan section */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">{tPlan("free")}</h2>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-600">
            {tBilling("freeBadge")}
          </span>
        </div>
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
