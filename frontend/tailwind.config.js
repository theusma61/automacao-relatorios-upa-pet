/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        vetaro: {
          emerald: '#00D296',
          teal: '#0D5C56',
          navy: '#0A141D',
          slate: '#637692',
          ice: '#F8FAFC'
        }
      }
    }
  },
  plugins: []
};
