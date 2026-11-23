/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  // AdminPanel builds a few colour classes dynamically
  safelist: [
    {
      pattern: /^(bg|text|border)-(blue|green|amber|purple)-(300|500|600|700)$/,
      variants: ['hover'],
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        // Poppins everywhere for English; system fonts cover Hindi/Telugu glyphs
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Noto Sans', 'sans-serif'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        elegant: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Spiritual palette: sandalwood cream, marigold, deep maroon
        sandal: {
          50: '#FFFCF7',
          100: '#FBF5EA',
          200: '#F4E8D3',
          300: '#E9D5B3',
        },
        marigold: {
          400: '#F6B23E',
          500: '#EE9A1E',
        },
        maroon: {
          500: '#8A3B2A',
          600: '#74301F',
          700: '#5C2618',
          800: '#431B11',
          900: '#2B120B',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 3px rgba(28, 25, 23, 0.06)',
        card: '0 1px 2px rgba(28, 25, 23, 0.04), 0 4px 16px -4px rgba(28, 25, 23, 0.08)',
        lift: '0 2px 4px rgba(28, 25, 23, 0.04), 0 12px 32px -8px rgba(28, 25, 23, 0.16)',
        glow: '0 8px 24px -6px rgba(234, 88, 12, 0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slow-zoom': {
          from: { transform: 'scale(1.0)' },
          to: { transform: 'scale(1.08)' },
        },
      },
      animation: {
        fadeIn: 'fade-in 0.35s ease-out both',
        'fade-in': 'fade-in 0.35s ease-out both',
        'scale-in': 'scale-in 0.25s ease-out both',
        scaleIn: 'scale-in 0.25s ease-out both',
        slideDown: 'slide-down 0.25s ease-out both',
        slideInRight: 'slide-in-right 0.3s ease-out both',
        'slide-in-left': 'slide-in-left 0.25s ease-out both',
        'bounce-slow': 'bounce-slow 3s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        'rise-in': 'rise-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slow-zoom': 'slow-zoom 24s ease-out both',
      },
    },
  },
  plugins: [],
};
