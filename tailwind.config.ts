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
        // סגול — צבע ההדגשה האחיד של המותג, בשימוש גם בערכה הכהה וגם בבהירה
        brand: {
          DEFAULT: "#9b6dff",
          dark: "#7c4ddb",
          light: "#c4abff",
        },
        // ערכת-הניהול הכהה (Sidebar קבוע + Header עליון)
        ink: {
          DEFAULT: "#1a1429",
          panel: "#221a35",
          line: "#352a4f",
          text: "#e8e4f5",
          muted: "#8878b0",
          active: "#2d2245",
        },
        // ערכת-העבודה הבהירה (עריכת טופס / שליחה / מילוי לקוח)
        paper: {
          DEFAULT: "#f8f7ff",
          line: "#e8e4f5",
          text: "#1a1429",
          muted: "#6b6385",
        },
        // רקע אזורי-הניהול (דשבורד / הגשות / הגדרות) — בהיר וסגלגל עדין
        surface: "#f0eeff",
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
