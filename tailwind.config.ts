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
        // טורקיז — צבע המותג, לפי טבלה 3 במסמך העיצוב v2
        brand: {
          DEFAULT: "#14B8A6",
          dark: "#0F9F91",
          light: "#E6FFFB",
        },
        // טקסט/רקעים/גבולות — לפי טבלה 3 (v2)
        navy: "#14213D",
        "text-secondary": "#64748B",
        "primary-dark": "#0B7F75",
        background: "#F6F8FB",
        border: "#E2E8F0",
        "soft-border": "#EEF2F7",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
        // ערכת-העבודה (עריכת טופס / שליחה / מילוי לקוח / כל מסכי הניהול)
        paper: {
          DEFAULT: "#F6F8FB",
          line: "#E2E8F0",
          text: "#14213D",
          muted: "#64748B",
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
