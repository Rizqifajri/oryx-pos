import type { Config } from "tailwindcss";

/**
 * tailwind.config.ts
 *
 * Strategy: CSS variables as the single source of truth.
 * Tailwind just *maps* semantic names → CSS vars.
 * This way you can theme/dark-mode purely via CSS without rebuilding.
 *
 * @see https://tailwindcss.com/docs/customizing-colors
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary (Brand Green) ─────────────────────────────────────────
        primary: {
          50:  "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)", // ← default, e.g. bg-primary-500
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
          950: "var(--color-primary-950)",
          DEFAULT: "var(--color-primary-500)", // bg-primary ← shorthand
        },

        // ── Secondary (Rich Black) ────────────────────────────────────────
        secondary: {
          50:  "var(--color-secondary-50)",
          100: "var(--color-secondary-100)",
          200: "var(--color-secondary-200)",
          300: "var(--color-secondary-300)",
          400: "var(--color-secondary-400)",
          500: "var(--color-secondary-500)",
          600: "var(--color-secondary-600)",
          700: "var(--color-secondary-700)",
          800: "var(--color-secondary-800)",
          900: "var(--color-secondary-900)",
          950: "var(--color-secondary-950)",
          DEFAULT: "var(--color-secondary-900)", // bg-secondary ← shorthand
        },

        // ── Surface ───────────────────────────────────────────────────────
        surface: {
          base:    "var(--color-surface-base)",
          subtle:  "var(--color-surface-subtle)",
          muted:   "var(--color-surface-muted)",
          overlay: "var(--color-surface-overlay)",
        },

        // ── Semantic ──────────────────────────────────────────────────────
        rating:   "var(--color-rating)",
        discount: "var(--color-discount)",

        // ── Text ──────────────────────────────────────────────────────────
        "text-primary":   "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-disabled":  "var(--color-text-disabled)",
        "text-inverse":   "var(--color-text-inverse)",
      },

      // ── Border Radius ───────────────────────────────────────────────────
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },

      // ── Box Shadow ──────────────────────────────────────────────────────
      boxShadow: {
        card: "var(--shadow-card)",
        cta:  "var(--shadow-cta)",
      },
    },
  },
  plugins: [],
};

export default config;