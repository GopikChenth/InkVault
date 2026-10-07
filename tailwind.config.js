/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          dim: 'var(--surface-dim)',
          bright: 'var(--surface-bright)',
          lowest: 'var(--surface-container-lowest)',
          low: 'var(--surface-container-low)',
          container: 'var(--surface-container)',
          high: 'var(--surface-container-high)',
          highest: 'var(--surface-container-highest)',
        },
        card: 'var(--card)',
        border: {
          DEFAULT: 'var(--border)',
          active: 'var(--border-active)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          container: 'var(--accent-container)',
          on: 'var(--on-accent)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          container: 'var(--secondary-container)',
        },
        tertiary: {
          DEFAULT: 'var(--tertiary)',
          container: 'var(--tertiary-container)',
        },
        'on-surface': {
          DEFAULT: 'var(--on-surface)',
          variant: 'var(--on-surface-variant)',
        },
        outline: {
          DEFAULT: 'var(--outline)',
          variant: 'var(--outline-variant)',
        },
      },
      transitionTimingFunction: {
        'caelestia-decel': 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        'caelestia-accel': 'cubic-bezier(0.3, 0, 0.8, 0.15)',
        'caelestia-standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'caelestia-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      fontFamily: {
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
