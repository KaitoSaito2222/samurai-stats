import type { Metadata } from "next";
import { Inter, Noto_Serif_JP, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiRemainingBanner from "@/components/AiRemainingBanner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-playfair",
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
    <html
      lang={locale}
      className={`${inter.variable} ${notoSerifJP.variable} ${playfair.variable}`}
    >
      <body className="bg-surface text-ink font-serif min-h-screen flex flex-col antialiased">
        <NextIntlClientProvider messages={messages}>
          <Navbar locale={locale} />
          <AiRemainingBanner />
          <main className="flex-1 w-full max-w-content mx-auto px-4 sm:px-6 lg:px-16 py-8 sm:py-10">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
