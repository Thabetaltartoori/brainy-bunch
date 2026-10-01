/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f3',
          100: '#d8ebe2',
          500: '#32876b',
          700: '#1e604c',
          900: '#173c33',
        },
        coral: {
          50: '#fff1ec',
          100: '#ffe0d6',
          200: '#ffc4b3',
          500: '#e7795a',
          700: '#bd5038',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Tajawal', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        panel: '0 1px 3px rgba(23, 60, 51, 0.06), 0 8px 24px rgba(23, 60, 51, 0.04)',
      },
    },
  },
  plugins: [],
};