/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './script.js'],
  theme: {
    extend: {
      screens: {
        lg: { raw: '(min-width: 1051px)' }
      }
    }
  },
  safelist: [
    'fi-sr-home', 'fi-rr-home', 'fi-sr-play-alt', 'fi-rr-play-alt',
    'fi-sr-menu-dots', 'fi-rr-menu-dots', 'fi-sr-heart', 'fi-rr-heart',
    { pattern: /^(bg|text|border)-(red|green|purple)-(100|300|400|500|600|700)$/ }
  ]
};
