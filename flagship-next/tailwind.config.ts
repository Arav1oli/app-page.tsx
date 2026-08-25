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
        navy: "#0B2545",
        abyss: "#06182F",
        gold: "#C9A158",
        "gold-bright": "#D8B36A",
        champagne: "#E9DCC0",
        paper: "#F4EFE5",
        ink: "#23344A",
        mist: "#93A3B8",
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.32em",
        wide2: "0.22em",
      },
    },
  },
  plugins: [],
};
export default config;
