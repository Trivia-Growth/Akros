import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0D2240",
          50: "#EAF0F8",
          100: "#CBD9EA",
          200: "#9DB6D3",
          300: "#6E93BC",
          400: "#4570A5",
          500: "#2C5488",
          600: "#1E3E68",
          700: "#152D4C",
          800: "#0D2240",
          900: "#081930",
          950: "#050F1E",
        },
        gold: {
          DEFAULT: "#C6A254",
          50: "#FBF6EB",
          100: "#F5EAD0",
          200: "#EAD5A1",
          300: "#DFC072",
          400: "#D4AF63",
          500: "#C6A254",
          600: "#A9843C",
          700: "#7F642E",
          800: "#564320",
          900: "#2C2210",
        },
        cream: {
          DEFAULT: "#F5F4F0",
          50: "#FFFFFF",
          100: "#FBFAF8",
          200: "#F5F4F0",
          300: "#E8E5DC",
        },
        border: {
          DEFAULT: "#E0DDD5",
        },
        ink: {
          DEFAULT: "#1A1A1A",
          soft: "#555555",
          muted: "#8A8A8A",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.6" }],
        sm: ["0.875rem", { lineHeight: "1.6" }],
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.25rem", { lineHeight: "1.4" }],
        "2xl": ["1.5rem", { lineHeight: "1.3" }],
        "3xl": ["2rem", { lineHeight: "1.2" }],
        "4xl": ["2.5rem", { lineHeight: "1.15" }],
        "5xl": ["3rem", { lineHeight: "1.1" }],
        "6xl": ["3.75rem", { lineHeight: "1.05" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(13, 34, 64, 0.08)",
        elevated: "0 10px 25px rgba(13, 34, 64, 0.12)",
        gold: "0 4px 14px rgba(198, 162, 84, 0.25)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-soft": "cubic-bezier(0.7, 0, 0.84, 0)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      letterSpacing: {
        label: "0.08em",
      },
    },
  },
  plugins: [],
} satisfies Config;
