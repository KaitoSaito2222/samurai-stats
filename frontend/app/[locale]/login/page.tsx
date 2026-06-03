"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import GoogleIcon from "@/components/GoogleIcon";

interface LoginPageProps {
  params: { locale: string };
}

export default function LoginPage({ params: { locale } }: LoginPageProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("redirectTo") || `/${locale}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace(nextPath);
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, [router, nextPath]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(t("invalidCredentials"));
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (authError) {
      setGoogleLoading(false);
      setError(t("generalError"));
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-navy">Samurai Stats</p>
          <p className="font-serif text-sm italic text-ink-muted mt-1">The Intelligence of Japanese Baseball</p>
        </div>

        <div className="bg-surface-card rounded border border-surface-border shadow-float p-6 space-y-4">
          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-surface-outline text-ink hover:border-navy hover:bg-surface-muted transition-colors font-sans text-sm disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? "..." : t("continueWithGoogle")}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="font-sans text-xs uppercase tracking-wide text-ink-muted">{t("or")}</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wide text-ink-muted mb-1">
                {t("email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded border border-surface-outline focus:outline-none focus:border-navy focus:ring-1 focus:ring-gold/40 font-sans text-sm text-ink bg-white"
              />
            </div>
            <div>
              <label className="block font-sans text-xs uppercase tracking-wide text-ink-muted mb-1">
                {t("password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded border border-surface-outline focus:outline-none focus:border-navy focus:ring-1 focus:ring-gold/40 font-sans text-sm text-ink bg-white"
              />
            </div>

            {error && (
              <p className="font-sans text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-navy text-white rounded-lg px-4 py-2.5 font-sans text-sm uppercase tracking-wide hover:bg-navy-dark transition-colors disabled:opacity-60"
            >
              {loading ? "..." : t("loginButton")}
            </button>
          </form>
        </div>

        <p className="text-center font-serif text-ink-muted text-sm mt-4">
          <a href={`/${locale}/signup`} className="text-gold-dark hover:text-navy font-sans uppercase tracking-wide text-xs">
            {t("createAccount")}
          </a>
        </p>
      </div>
    </div>
  );
}

