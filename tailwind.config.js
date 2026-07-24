/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Couleurs de type de document
        cours:      '#0f766e', // teal
        controle:   '#b45309', // amber foncé
        correction: '#6d28d9', // violet
      },
    },
  },
  plugins: [],
}
