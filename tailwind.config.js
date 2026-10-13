/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ui)', 'sans-serif'],
      },
      colors: {
        background: '#F8FAFC', // slate-50
        surface: '#FFFFFF',
        primary: '#16A34A', // Xanh cỏ tươi mướt
        primary_hover: '#15803D',
        primary_light: '#DCFCE7', // green-100
        danger: '#EF4444',
      },
      boxShadow: {
        'soft': '0 8px 30px rgb(0 0 0 / 0.04)',
        'soft-lg': '0 12px 40px rgb(0 0 0 / 0.07)',
        'floating': '0 20px 45px -10px rgba(17, 24, 39, 0.35)',
      }
    },
  },
  plugins: [],
}
