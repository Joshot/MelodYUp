/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#FFFFFF',
        surface: '#F8FAFC',
        border: '#E2E8F0',
        accent: '#4F8CFF',
        purple: '#7C3AED',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
