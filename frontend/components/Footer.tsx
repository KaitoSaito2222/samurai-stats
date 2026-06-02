import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface FooterProps {
  locale: string;
}

export default async function Footer({ locale }: FooterProps) {
  const t = await getTranslations("footer");

  const links = [
    { href: `/${locale}/about`, label: t("about") },
    { href: `/${locale}/terms`, label: t("terms") },
    { href: `/${locale}/privacy`, label: t("privacy") },
    { href: `/${locale}/contact`, label: t("contact") },
  ];

  return (
    <footer className="w-full bg-navy-dark border-t border-gold/20 mt-16">
      <div className="max-w-content mx-auto py-10 px-4 sm:px-6 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <span className="font-display text-2xl font-bold text-white">Samurai Stats</span>
          <p className="font-sans text-xs text-white/50 mt-2">{t("copyright")}</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-sm uppercase tracking-wide text-white/70 hover:text-gold transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
