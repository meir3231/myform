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
        // טורקיז — צבע המותג, לפי טבלה 3.1 במסמך העיצוב
        brand: {
          DEFAULT: "#14B8A6",
          dark: "#0F9F98",
          light: "#DCF4F3",
        },
        // טקסט/רקעים/גבולות — לפי טבלה 3.1
        navy: "#0F1F37",
        "text-secondary": "#667085",
        background: "#F6F8FB",
        border: "#E4EAF2",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
        // ערכת-העבודה (עריכת טופס / שליחה / מילוי לקוח / כל מסכי הניהול)
        paper: {
          DEFAULT: "#F6F8FB",
          line: "#E4EAF2",
          text: "#0F1F37",
          muted: "#667085",
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
