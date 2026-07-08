import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f",
        muted: "#6e6e73",
        line: "#d2d2d7",
        paper: "rgba(255, 255, 255, 0.82)",
        wash: "#f5f5f7",
        mint: "#30d158",
        tomato: "#ff3b30",
        apple: "#007aff"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(0, 0, 0, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
