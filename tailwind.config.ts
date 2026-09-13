import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F2",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#16171B",
          soft: "#6B6D76",
          faint: "#A3A5AC",
        },
        line: "#E7E5E0",
        pulse: "#2FE38A",
        danger: "#E5484D",
        bodypart: {
          chest: "#FF6B4A",
          back: "#4C6FFF",
          shoulder: "#FFB63D",
          abs: "#21B8A6",
          arm: "#A66BFF",
          cardio: "#FF4D79",
          lower: "#34B37A",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
      },
      borderRadius: {
        xl2: "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(22,23,27,0.04), 0 8px 24px rgba(22,23,27,0.06)",
        sheet: "0 -8px 30px rgba(22,23,27,0.12)",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
