/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        surface: {
          0: "#0a0a0f",
          1: "#0f0f1a",
          2: "#141420",
          3: "#1a1a2e",
          4: "#1e1e35",
        },
        accent: {
          cyan: "#06b6d4",
          purple: "#8b5cf6",
          red: "#ef4444",
          orange: "#f97316",
          green: "#22c55e",
          yellow: "#eab308",
        },
        border: {
          DEFAULT: "#1e1e35",
          bright: "#2a2a4a",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          from: { boxShadow: "0 0 4px #06b6d4, 0 0 8px #06b6d4" },
          to: { boxShadow: "0 0 8px #06b6d4, 0 0 20px #06b6d4, 0 0 40px #06b6d433" },
        },
      },
    },
  },
  plugins: [],
};
