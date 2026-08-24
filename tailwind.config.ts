import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // REQUIRED: STATUS_CONFIG and PRIORITY_CONFIG in lib/utils.ts hold their
    // Tailwind class names as strings. Without this glob the JIT compiler never
    // sees them, so every status dot and priority badge ships with no colour
    // and all six pipeline columns render identically.
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The 200/300/400/800 steps are used for hover borders and accents
        // (e.g. brand-200, brand-300); without them those classes are no-ops.
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
    },
  },
  plugins: [],
}

export default config
