/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Fond crème (identité émeraude + crème)
        cream: {
          DEFAULT: '#f6f2e9',
          50: '#fbf9f3',
          100: '#f6f2e9',
          200: '#ece4d3',
        },
        // Couleurs de type de document
        cours:      '#047857', // emerald-700
        controle:   '#b45309', // amber foncé
        correction: '#7c3aed', // violet
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
