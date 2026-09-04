/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#0a0a0a",
        alabaster: "#F0F0F0",
        // Veinote Admin surface ramp. Scoped to app/admin/** — the platform stays
        // on its light stone/#FAF9F5 palette and is unaffected by these.
        ink: {
          950: "#0B0B0C", // page background
          900: "#0E0E0F", // sidebar
          850: "#141416", // panel
          800: "#17181A", // raised panel / row hover
          700: "#1E1F22", // input, active row
          600: "#26282C", // border
          500: "#3A3D42", // strong border, disabled text
          400: "#6B7078", // muted text
          300: "#9AA0A8", // secondary text
          200: "#C9CDD2", // body text
          100: "#E8E8E6", // primary text
        },
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
        green: {
          50: '#F3FAF0',
          100: '#E7F5E2',
          200: '#D1ECD4',
          300: '#BCE2BC',
          400: '#A1D1A1',
          500: '#86BE7F',
          600: '#86BE7F',
          650: '#86BE7F',
          700: '#6CA365',
          750: '#6CA365',
          800: '#53884D',
          900: '#3D6D37',
        },
        emerald: {
          50: '#F3FAF0',
          100: '#E7F5E2',
          200: '#D1ECD4',
          300: '#BCE2BC',
          400: '#A1D1A1',
          500: '#86BE7F',
          600: '#86BE7F',
          700: '#6CA365',
          800: '#53884D',
          900: '#3D6D37',
        },
      },
      // One self-hosted family for the whole app (see app/layout.tsx). The four
      // aliases are kept because the codebase uses them interchangeably; the
      // local-font names stay as a fallback for the moment before the webfont
      // paints.
      fontFamily: {
        serif: ["var(--font-app)", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        sans: ["var(--font-app)", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-app)", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        caveat: ["var(--font-app)", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        // font-lyrics: the songwriter's own words, everywhere they appear.
        lyrics: ["var(--font-lyrics)", "Georgia", "Times New Roman", "serif"],
        // font-chords: chord symbols, everywhere THEY appear. Straight Helvetica,
        // not var(--font-app): a chord name is notation, not prose, and it sits
        // right on top of the serif lyrics — the plain sans face is what keeps
        // Cmaj7 reading as a label rather than a word in the song.
        chords: ["'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
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
