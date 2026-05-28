import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#E01A38",  // MLB red — slightly brighter for light backgrounds
          dark: "#B5122C",
        },
        pro: "#F59E0B",        // gold — Pro badges, upgrade prompts
        navy: {
          DEFAULT: "#1B3A6B",  // navy blue — navbar background
          dark: "#0E2347",     // darker navy — hover/active
        },
        surface: {
          DEFAULT: "#F0F4F8",  // light blue-gray page background
          card: "#FFFFFF",     // white card backgrounds
          border: "#DDE3ED",   // light blue-gray borders
          muted: "#F8FAFC",    // subtle off-white sections
        },
      },
      fontFamily: {
        sans: ["Noto Sans JP", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
