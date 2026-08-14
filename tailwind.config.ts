import type { Config } from 'tailwindcss';

/**
 * NexCuba design tokens — extracted from design-spec.md (computed values of
 * the reference site, viewport 1440px). Do not invent colors: every token
 * traces back to design-spec.md §2/§7.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './e2e/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Inter', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#111827', // gray-900 — headings, primary button
          deep: '#0A0A0A', // near-black hero
          dark: '#1A1A1A', // hero alternate
        },
        gold: {
          DEFAULT: '#E8C98A', // the single saturated brand accent
        },
        cream: {
          50: '#F8F7F5',
          100: '#F8F6F3', // page background
          200: '#F5F4F1', // footer background
          300: '#F0EBE4',
        },
        stat: {
          neutral: '#F8F7F5',
          warm: '#F0EBE4',
          green: '#E8EDE8',
          rose: '#EDE8E8',
        },
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
