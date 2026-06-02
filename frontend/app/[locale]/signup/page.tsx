"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

interface SignupPageProps {
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

export default function SignupPage({ params: { locale } }: SignupPageProps) {
  const tAuth = useTranslations("auth");
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace(`/${locale}`);
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, [router, locale]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-navy">Samurai Stats</p>
          <h1 className="font-serif text-sm italic text-ink-muted mt-1">{tAuth("signupTitle")}</h1>
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
                  confirmation_text: tAuth("checkEmail"),
                },
              },
            }}
            view="sign_up"
            showLinks={true}
            redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/${locale}`}
          />
        </div>
        <p className="text-center font-serif text-ink-muted text-sm mt-4">
          <a href={`/${locale}/login`} className="text-gold-dark hover:text-navy font-sans uppercase tracking-wide text-xs">
            {tAuth("loginHere")}
          </a>
        </p>
      </div>
    </div>
  );
}
