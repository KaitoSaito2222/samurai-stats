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
        brand: "#E01A38",
        brandAccent: "#B5122C",
        inputBackground: "#FFFFFF",
        inputText: "#0F172A",
        inputBorder: "#DDE3ED",
        inputBorderFocus: "#E01A38",
        inputBorderHover: "#DDE3ED",
        messageText: "#475569",
        anchorTextColor: "#E01A38",
        dividerBackground: "#DDE3ED",
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
          <h1 className="text-2xl font-bold text-slate-900">{tNav("login")}</h1>
        </div>
        <div className="bg-surface-card rounded-xl border border-surface-border p-6">
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
        <p className="text-center text-slate-600 text-sm mt-4">
          <a href={`/${locale}/signup`} className="text-brand hover:underline">
            {tAuth("createAccount")}
          </a>
        </p>
      </div>
    </div>
  );
}
