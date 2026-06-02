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
      <div className="border-b border-surface-border pb-3">
        <h1 className="font-display text-2xl sm:text-[28px] font-bold text-navy leading-tight">{t("title")}</h1>
      </div>

      {/* Plan section */}
      <div className="bg-surface-card border border-surface-border rounded p-6 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-navy">{tPlan("free")}</h2>
          <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-lg bg-surface-muted text-ink-muted">
            {tBilling("freeBadge")}
          </span>
        </div>
        <p className="font-serif text-sm text-ink-muted">{t("planDescription")}</p>
        <Link
          href={`/${locale}/billing`}
          className="inline-block px-5 py-2.5 bg-navy hover:bg-navy-dark text-white font-sans text-sm font-semibold uppercase tracking-wide rounded-lg transition-colors"
        >
          {tPlan("upgrade")}
        </Link>
      </div>

      {/* Language section */}
      <div className="bg-surface-card border border-surface-border rounded p-6 space-y-4">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-navy">{t("language")}</h2>
        <div className="flex gap-3">
          <Link
            href="/ja/settings"
            className={`px-4 py-2 rounded-lg border font-sans text-sm font-medium transition-colors ${
              locale === "ja"
                ? "bg-navy text-white border-navy"
                : "bg-surface-card border-surface-border text-navy hover:border-gold"
            }`}
          >
            日本語
          </Link>
          <Link
            href="/en/settings"
            className={`px-4 py-2 rounded-lg border font-sans text-sm font-medium transition-colors ${
              locale === "en"
                ? "bg-navy text-white border-navy"
                : "bg-surface-card border-surface-border text-navy hover:border-gold"
            }`}
          >
            English
          </Link>
        </div>
      </div>

      {/* Subscription management */}
      <div className="bg-surface-card border border-surface-border rounded p-6 space-y-4">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-navy">{t("subscription")}</h2>
        <p className="font-serif text-sm text-ink-muted">{t("subscriptionDescription")}</p>
        <Link
          href={`/${locale}/billing`}
          className="inline-block px-5 py-2.5 border border-surface-border text-navy hover:border-gold font-sans text-sm font-medium uppercase tracking-wide rounded-lg transition-colors"
        >
          {tBilling("manageSubscription")}
        </Link>
      </div>
    </div>
  );
}
