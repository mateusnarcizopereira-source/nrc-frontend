/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        none: '0',
        sm:   '2px',
        DEFAULT: '4px',
        md:   '4px',
        lg:   '4px',
        xl:   '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '9999px',
      },
      colors: {
        nrc: {
          50:  '#180a07',
          100: '#2e0f08',
          200: '#5a1e10',
          300: '#8a2e1a',
          400: '#b33c21',
          500: '#E74C3C',
          600: '#C0392B',
          700: '#a93226',
          800: '#8c2920',
          900: '#6b1f18',
        },
      },
    },
  },
  plugins: [],
};
