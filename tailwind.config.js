/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#08090D', panel: '#111319', elevated: '#191B23',
        accent: '#E11D48', 'accent-hover': '#FB365C', gold: '#D6AD60',
        muted: '#9CA3AF', line: '#292D36',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
