import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // "Bushido Data Light" — navy lead, gold accent (see frontend/CLAUDE.md)
        navy: {
          DEFAULT: "#031427", // primary text, headers, table heads, primary CTA
          dark: "#0B1C30",    // footer / darker navy surfaces
        },
        gold: {
          DEFAULT: "#D4A843", // accent: active states, dividers, secondary CTA
          dark: "#B5912F",
        },
        ink: {
          DEFAULT: "#191C1D", // body text
          muted: "#44474C",   // muted body text
        },
        surface: {
          DEFAULT: "#F8F9FA", // page background
          card: "#FFFFFF",    // card / container background
          border: "#E5E7EB",  // hairline dividers
          muted: "#F3F4F5",   // zebra rows, data-heavy containers
          outline: "#C4C6CD", // stronger outline
        },
        error: "#BA1A1A", // error states only (red is retired from branding)
        // Back-compat aliases for legacy components.
        brand: {
          DEFAULT: "#031427",
          dark: "#0B1C30",
        },
        pro: "#D4A843",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Playfair Display", "serif"],
        serif: ["var(--font-noto-serif-jp)", "Noto Serif JP", "serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
      },
      boxShadow: {
        float: "0 4px 20px rgba(3, 20, 39, 0.10)",
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
