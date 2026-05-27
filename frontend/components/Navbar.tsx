"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface NavbarProps {
  locale: string;
}

export default function Navbar({ locale }: NavbarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Switch locale while preserving the rest of the path
  const switchLocale = (newLocale: string) => {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    return segments.join("/");
  };

  const navLinks = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/players`, label: t("players") },
    { href: `/${locale}/rankings`, label: t("rankings") },
  ];

  if (session) {
    navLinks.push({ href: `/${locale}/search`, label: t("search") });
  }

  return (
    <nav className="bg-surface-card border-b border-surface-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="text-brand">⚾</span>
            <span className="hidden sm:inline">Samurai Stats</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-brand"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: locale toggle + auth */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex rounded-lg border border-surface-border overflow-hidden text-xs">
              <Link
                href={switchLocale("ja")}
                className={`px-2 py-1 font-medium transition-colors ${
                  locale === "ja"
                    ? "bg-brand text-white"
                    : "text-slate-400 hover:text-white hover:bg-surface-border"
                }`}
              >
                JA
              </Link>
              <Link
                href={switchLocale("en")}
                className={`px-2 py-1 font-medium transition-colors ${
                  locale === "en"
                    ? "bg-brand text-white"
                    : "text-slate-400 hover:text-white hover:bg-surface-border"
                }`}
              >
                EN
              </Link>
            </div>

            {/* Auth button */}
            {session ? (
              <button
                onClick={handleLogout}
                className="hidden md:block text-sm text-slate-300 hover:text-white transition-colors"
              >
                {t("logout")}
              </button>
            ) : (
              <Link
                href={`/${locale}/login`}
                className="hidden md:block px-4 py-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t("login")}
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-slate-300 hover:text-white p-1"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-surface-border py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-brand bg-brand/10"
                    : "text-slate-300 hover:text-white hover:bg-surface-border"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-surface-border">
              {session ? (
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white"
                >
                  {t("logout")}
                </button>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-brand hover:text-brand-dark"
                >
                  {t("login")}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
