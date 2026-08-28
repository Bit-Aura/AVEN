/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Anthropic Sans"', 'sans-serif'],
        serif: ['"Anthropic Serif"', 'serif'],
        mono: ['"Anthropic Mono"', '"JetBrains Mono"', 'monospace'],
      },
      colors: {
        aven: {
          primary: 'var(--aven-primary)',
          secondary: 'var(--aven-secondary)',
          base: 'var(--aven-base)',
          surface: 'var(--aven-surface)',
          border: 'var(--aven-border)',
          text: {
            DEFAULT: 'var(--aven-text)',
            subtle: 'var(--aven-text-subtle)',
            muted: 'var(--aven-text-muted)'
          },
          status: {
            active: 'var(--aven-status-active)',
            locked: 'var(--aven-status-locked)',
            mastered: 'var(--aven-status-mastered)'
          }
        },
        background: "#090d16",
        surface: {
          DEFAULT: "#0f172a",
          secondary: "#1e293b",
          tertiary: "#334155",
          highlight: "#1e293b80"
        },
        border: {
          DEFAULT: "#1e293b",
          subtle: "#334155",
          accent: "#6366f1"
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-blue': '0 0 20px -5px rgba(59, 130, 246, 0.4)',
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.4)',
        'glow-rose': '0 0 20px -5px rgba(244, 63, 94, 0.4)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}

