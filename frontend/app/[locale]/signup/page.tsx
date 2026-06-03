"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import GoogleIcon from "@/components/GoogleIcon";

interface SignupPageProps {
  params: { locale: string };
}

export default function SignupPage({ params: { locale } }: SignupPageProps) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Handle the case where email confirmation is disabled in Supabase:
  // signUp() issues a session immediately, so SIGNED_IN fires right away.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace(`/${locale}`);
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, [router, locale]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("weakPassword"));
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) {
      if (authError.message.toLowerCase().includes("already")) {
        setError(t("emailTaken"));
      } else {
        setError(t("generalError"));
      }
      return;
    }
    // With email confirmation ON, show the "check your email" screen.
    // With email confirmation OFF, onAuthStateChange fires SIGNED_IN and redirects.
    setDone(true);
  }

  async function handleGoogleSignup() {
    setError(null);
    setGoogleLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}`,
      },
    });
    if (authError) {
      setGoogleLoading(false);
      setError(t("generalError"));
    }
  }

  if (done) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📬</div>
          <p className="font-display text-xl font-bold text-navy">{t("checkEmailTitle")}</p>
          <p className="font-serif text-ink-muted">{t("checkEmail")}</p>
          <a href={`/${locale}/login`} className="inline-block font-sans text-xs uppercase tracking-wide text-gold-dark hover:text-navy transition-colors">
            {t("loginHere")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-navy">Samurai Stats</p>
          <h1 className="font-serif text-sm italic text-ink-muted mt-1">{t("signupTitle")}</h1>
        </div>

        <div className="bg-surface-card rounded border border-surface-border shadow-float p-6 space-y-4">
          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignup}
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
          <form onSubmit={handleSignup} className="space-y-3">
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
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded border border-surface-outline focus:outline-none focus:border-navy focus:ring-1 focus:ring-gold/40 font-sans text-sm text-ink bg-white"
              />
              <p className="font-sans text-[11px] text-ink-muted mt-1">{t("passwordHint")}</p>
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
              {loading ? "..." : t("signupButton")}
            </button>
          </form>
        </div>

        <p className="text-center font-serif text-ink-muted text-sm mt-4">
          <a href={`/${locale}/login`} className="text-gold-dark hover:text-navy font-sans uppercase tracking-wide text-xs">
            {t("loginHere")}
          </a>
        </p>
      </div>
    </div>
  );
}
