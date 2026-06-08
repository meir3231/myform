import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
      },
      colors: {
        // כחול-נייבי — צבע ראשי של "משרד עורכי דין": רציני, מקצועי, לא צעקני
        brand: {
          DEFAULT: "#1e3a5f",
          dark: "#142A45",
          light: "#2f567f",
        },
        // זהב/בז' — צבע הדגשה ויוקרה (כותרות נבחרות, מסגרות, אייקונים)
        gold: {
          DEFAULT: "#c9a84c",
          dark: "#a8893a",
          light: "#e0c87a",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in .4s ease-out both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
