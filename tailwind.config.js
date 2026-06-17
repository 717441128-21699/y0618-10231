/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          950: "#070A0E",
          900: "#0B0E13",
          850: "#0F131A",
          800: "#131820",
          750: "#161C26",
          700: "#1A212B",
          650: "#1F2731",
          600: "#232B36",
          500: "#2E3845",
          400: "#3B4654",
          300: "#5A6573",
          200: "#8B95A5",
          100: "#B8C1CE",
          50: "#E6EAF0",
        },
        phosphor: {
          DEFAULT: "#2DD4BF",
          soft: "#5EEAD4",
          deep: "#0D9488",
          glow: "rgba(45,212,191,0.16)",
        },
        amberph: {
          DEFAULT: "#F59E0B",
          soft: "#FBBF24",
        },
        emeraldph: "#34D399",
        roseph: "#FB7185",
        skyph: "#38BDF8",
        violeph: "#A78BFA",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Hanken Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,191,0.25), 0 0 24px rgba(45,212,191,0.12)",
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 40px -16px rgba(0,0,0,0.6)",
        chip: "0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.4)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
        "radial-fade":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(45,212,191,0.10), transparent 70%)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.85)" },
        },
        "scan": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "rise": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sweep": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "scan": "scan 2.4s ease-in-out infinite",
        "rise": "rise 0.4s cubic-bezier(0.2,0.7,0.2,1) both",
        "sweep": "sweep 3s linear infinite",
      },
    },
  },
  plugins: [],
};
