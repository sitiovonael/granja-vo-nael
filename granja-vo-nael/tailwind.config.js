/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#F5A624',
          'orange-dark': '#E09010',
          navy: '#1E2B5E',
          'navy-light': '#2D3E7E',
          brown: '#8B4513',
        }
      }
    }
  },
  plugins: []
}
