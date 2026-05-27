import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#C8102E",
          dark: "#9E0B24",
        },
        pro: "#F5A623",
        surface: {
          DEFAULT: "#0F172A",
          card: "#1E293B",
          border: "#334155",
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
