"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

interface LoginPageProps {
  params: { locale: string };
}

const authAppearance = {
  theme: ThemeSupa,
  variables: {
    default: {
      colors: {
        brand: "#031427",
        brandAccent: "#0B1C30",
        inputBackground: "#FFFFFF",
        inputText: "#191C1D",
        inputBorder: "#C4C6CD",
        inputBorderFocus: "#D4A843",
        inputBorderHover: "#C4C6CD",
        messageText: "#44474C",
        anchorTextColor: "#B5912F",
        dividerBackground: "#E5E7EB",
      },
    },
  },
};

export default function LoginPage({ params: { locale } }: LoginPageProps) {
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("redirectTo") || `/${locale}`;

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace(nextPath);
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, [router, nextPath]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-navy">Samurai Stats</p>
          <p className="font-serif text-sm italic text-ink-muted mt-1">The Intelligence of Japanese Baseball</p>
        </div>
        <div className="bg-surface-card rounded border border-surface-border shadow-float p-6">
          <Auth
            supabaseClient={supabase}
            appearance={authAppearance}
            localization={{
              variables: {
                sign_in: {
                  email_label: tAuth("email"),
                  password_label: tAuth("password"),
                  button_label: tAuth("loginButton"),
                  link_text: tAuth("haveAccount"),
                },
                sign_up: {
                  email_label: tAuth("email"),
                  password_label: tAuth("password"),
                  button_label: tAuth("signupButton"),
                  link_text: tAuth("noAccount"),
                },
              },
            }}
            view="sign_in"
            showLinks={true}
            redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/${locale}`}
          />
        </div>
        <p className="text-center font-serif text-ink-muted text-sm mt-4">
          <a href={`/${locale}/signup`} className="text-gold-dark hover:text-navy font-sans uppercase tracking-wide text-xs">
            {tAuth("createAccount")}
          </a>
        </p>
      </div>
    </div>
  );
}
