/** @type {import('tailwindcss').Config} */
import { tigercatPlugin } from '@expcat/tigercat-core';

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/@expcat/tigercat-*/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {},
  },
  plugins: [tigercatPlugin],
};
