/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080F20', panel: '#111D35', elevated: '#172744',
        accent: '#2563EB', 'accent-hover': '#1D4ED8', gold: '#38BDF8', cyan: '#38BDF8',
        muted: '#94A3B8', line: '#294064',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
