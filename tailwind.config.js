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
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
