const colors = require('tailwindcss/colors');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',    // Royal Blue
          light: '#3B82F6',
          dark: '#1D4ED8',
        },
        secondary: {
          DEFAULT: '#4ADE80',    // Emerald Green
          light: '#86EFAC',
          dark: '#15803D',
        },
        accent: '#F59E0B',       // Mustard Yellow
        background: '#F9FAFB',   // Soft Light Gray/White
        'text-primary': '#1E293B',    // Dark Slate Gray
        'text-secondary': '#475569',  // Medium Gray-Blue
      }
    },
  },
  plugins: [],
}
