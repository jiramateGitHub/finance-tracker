import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
      },
      colors: {
        finance: {
          bg: '#f4f8fc',
          card: '#ffffff',
          text: '#0f172a',
          muted: '#64748b',
          line: '#e2e8f0',
          primary: '#2563eb',
          income: '#059669',
          expense: '#e11d48',
          amber: '#d97706',
          warning: '#d97706',
          violet: '#7c3aed',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        finance: '0 14px 32px rgba(15, 23, 42, 0.07)',
        'finance-sm': '0 8px 20px rgba(15, 23, 42, 0.055)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config
