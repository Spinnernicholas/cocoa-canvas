import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#1e40af',
        // Cozy cocoa theme colors
        cocoa: {
          50: '#faf8f5',   // warm cream
          100: '#f5f0e8',  // light cream
          200: '#e8dcc8',  // beige
          300: '#d4bcA0',  // tan
          400: '#b8936d',  // caramel
          500: '#8B6F47',  // cocoa brown
          600: '#6d5537',  // dark cocoa
          700: '#54402a',  // chocolate
          800: '#3d2e1f',  // rich chocolate
          900: '#2a1f15',  // espresso
        },
        cinnamon: {
          400: '#d97757',  // light cinnamon
          500: '#c85a3a',  // cinnamon
          600: '#a84832',  // dark cinnamon
        },
        cream: {
          50: '#fffdfb',
          100: '#fef9f5',
          200: '#fdf5ed',
        },
      },
    },
  },
  plugins: [],
}
export default config
