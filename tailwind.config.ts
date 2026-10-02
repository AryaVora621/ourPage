import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        sand: "rgb(var(--sand) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        sun: "rgb(var(--sun) / <alpha-value>)",
        arya: "rgb(var(--arya) / <alpha-value>)",
        teju: "rgb(var(--teju) / <alpha-value>)",
        both: "rgb(var(--both) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Georgia", "ui-serif", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
