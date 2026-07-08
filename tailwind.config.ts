import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        muted: "#6b7280",
        line: "#e5e7eb",
        paper: "#ffffff",
        wash: "#f6f7f9",
        mint: "#14b8a6",
        tomato: "#ef4444"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(15, 23, 42, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
