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
    { href: `/${locale}/games`, label: t("games") },
  ];

  if (session) {
    navLinks.push({ href: `/${locale}/search`, label: t("search") });
  }

  return (
    <nav className="navbar-accent bg-surface-card border-b border-surface-border sticky top-0 z-50">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-16">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-10">
            <Link
              href={`/${locale}`}
              className="font-display text-xl sm:text-2xl font-bold text-navy tracking-tight"
            >
              Samurai Stats
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`font-sans text-sm uppercase tracking-wide transition-colors pb-0.5 ${
                      active
                        ? "text-navy font-bold border-b-2 border-gold"
                        : "text-ink-muted hover:text-gold-dark"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side: locale toggle + auth */}
          <div className="flex items-center gap-4">
            {/* Language toggle */}
            <div className="flex rounded-lg border border-surface-outline overflow-hidden text-xs">
              <Link
                href={switchLocale("ja")}
                className={`px-2.5 py-1 font-sans font-semibold transition-colors ${
                  locale === "ja"
                    ? "bg-navy text-white"
                    : "text-ink-muted hover:bg-surface-muted"
                }`}
              >
                JA
              </Link>
              <Link
                href={switchLocale("en")}
                className={`px-2.5 py-1 font-sans font-semibold transition-colors ${
                  locale === "en"
                    ? "bg-navy text-white"
                    : "text-ink-muted hover:bg-surface-muted"
                }`}
              >
                EN
              </Link>
            </div>

            {/* Auth button */}
            {session ? (
              <button
                onClick={handleLogout}
                className="hidden md:block font-sans text-sm uppercase tracking-wide text-ink-muted hover:text-navy transition-colors"
              >
                {t("logout")}
              </button>
            ) : (
              <Link
                href={`/${locale}/login`}
                className="hidden md:block px-5 py-2 bg-navy hover:bg-navy-dark text-white font-sans text-sm font-semibold uppercase tracking-wide rounded-lg transition-colors"
              >
                {t("login")}
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-navy p-1"
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
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg font-sans text-sm uppercase tracking-wide transition-colors ${
                    active
                      ? "text-navy font-bold bg-gold/10"
                      : "text-ink-muted hover:text-navy hover:bg-surface-muted"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-surface-border">
              {session ? (
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 font-sans text-sm uppercase tracking-wide text-ink-muted hover:text-navy"
                >
                  {t("logout")}
                </button>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 font-sans text-sm uppercase tracking-wide text-navy font-semibold"
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
