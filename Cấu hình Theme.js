/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a', // Xanh đen navy đậm
        surface: 'rgba(255, 255, 255, 0.05)', // Kính mờ
        primary: '#00FF66', // Xanh cỏ Neon
        primary_hover: '#00E65C',
        danger: '#FF4C4C',
      },
      backgroundImage: {
        'liquid-gradient': 'radial-gradient(circle at top left, rgba(0, 255, 102, 0.15), transparent 40%), radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.15), transparent 40%)',
      }
    },
  },
  plugins: [],
}