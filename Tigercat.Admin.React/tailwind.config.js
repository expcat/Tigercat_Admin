/** @type {import('tailwindcss').Config} */
// tailwind.config.js
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/@expcat/tigercat-*/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
