import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import Navbar from "@/components/Navbar";
import AiRemainingBanner from "@/components/AiRemainingBanner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Samurai Stats | MLB Japanese Players",
    template: "%s | Samurai Stats",
  },
  description: "Deep analysis of Japanese MLB players — bilingual stats, AI summaries, and game updates.",
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function RootLayout({ children, params: { locale } }: RootLayoutProps) {
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${notoSansJP.variable}`}>
      <body className="bg-surface text-white font-sans min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <Navbar locale={locale} />
          <AiRemainingBanner />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
