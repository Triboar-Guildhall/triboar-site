/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.md",
    "./static/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'guild-brown': '#3D2914',
        'guild-brown-dark': '#2A1C0E',
        'guild-beige': '#D4C4A8',
        'guild-beige-light': '#E8DCC6',
        'guild-beige-dark': '#C0B094',
        'guild-gold': '#B8860B',
        'guild-gold-dark': '#d4a94c',
        'guild-blue': '#2C3E50',
        'guild-blue-dark': '#1A252F',
        'guild-blue-light': '#34495E',
        'guild-blue-darker': '#2f3a4f',
        'parchment-border': '#8b6f47',
      },
      fontFamily: {
        'serif': ['Merriweather', 'Georgia', 'serif'],
        'sans': ['Inter', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}