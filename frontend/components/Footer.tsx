import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="w-full bg-navy-dark border-t border-gold/20 mt-16">
      <div className="max-w-content mx-auto py-10 px-4 sm:px-6 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-display text-2xl font-bold text-white">Samurai Stats</span>
        <p className="font-sans text-xs text-white/50">{t("copyright")}</p>
      </div>
    </footer>
  );
}
