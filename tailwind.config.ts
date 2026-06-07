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
        brand: {
          DEFAULT: "#1e40af",
          dark: "#1e3a8a",
          light: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
