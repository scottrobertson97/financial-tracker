/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ledger: {
          ink: '#1f2933',
          muted: '#6b7280',
          line: '#d8dee9',
          paper: '#f8fafc',
          panel: '#ffffff',
          accent: '#2563eb',
          gain: '#15803d',
          loss: '#b42318',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
