import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "serif"]
      },
      colors: {
        roseMist: "#fff6f8",
        blush: "#ffdbe5",
        petal: "#f7b9c9",
        champagne: "#fff9f4",
        ink: "#3e2a32"
      },
      boxShadow: {
        soft: "0 12px 40px rgba(182, 117, 136, 0.16)",
        card: "0 20px 60px rgba(171, 122, 138, 0.18)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        fadeUp: "fadeUp 0.5s ease-out"
      }
    }
  },
  plugins: []
};

export default config;
