import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#061320",
        surface: "#0a2540",
        "surface-2": "#0e2b48",
        "neo-border": "#1d4368",
        accent: "#5bcbf5",
        "accent-2": "#3aa6cc",
        "neo-text": "#e2e8f0",
        "text-dim": "#cbd5e1",
        muted: "#858889",
        "muted-2": "#a8aaab",
        charcoal: "#2b2f2e",
        navy: {
          950: "#061320",
          900: "#0a2540",
          800: "#0e2b48",
          700: "#14375a",
          600: "#1d4368",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: ["ui-monospace", '"SF Mono"', "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 8px 22px rgba(0,0,0,0.35)",
        modal: "0 30px 80px rgba(0,0,0,0.5)",
        accent: "0 4px 14px rgba(91,203,245,0.30)",
        "accent-lg": "0 6px 18px rgba(91,203,245,0.35)",
        "nav-glow": "0 0 12px rgba(91,203,245,0.55)",
      },
    },
  },
  plugins: [],
};

export default config;
