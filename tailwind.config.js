/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#0a0a0a",
        alabaster: "#F0F0F0",
        gold: {
          50: '#FAF7F2',
          100: '#F2E9D4',
          200: '#E5D3A9',
          300: '#D7BC7E',
          400: '#C9A653',
          500: '#C5A059', // Primary gold
          600: '#9E8047',
          700: '#776035',
          800: '#4F4023',
          900: '#282012',
        },
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["Inter", "sans-serif"],
        display: ["'Playfair Display'", "serif"],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      borderRadius: {
        'xs': '2px',
      },
      keyframes: {
        'pulse-y': {
          'from': { transform: 'scaleY(0.5)', opacity: '0.1' },
          'to': { transform: 'scaleY(1.5)', opacity: '0.5' },
        }
      },
      animation: {
        'pulse-y': 'pulse-y 1s ease-in-out infinite alternate',
      }
    },
  },
  plugins: [],
}
