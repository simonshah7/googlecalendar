/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        valuenova: {
          bg: '#0B0E14',
          surface: '#161B22',
          border: '#30363D',
          accent: '#58A6FF',
          text: '#C9D1D9',
          muted: '#8B949E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
