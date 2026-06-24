import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta extraída da logo Manahau Va'A
        brand: {
          orange: '#F47B1A',       // laranja da logo
          'orange-dark': '#D4660E', // hover / pressed
          'orange-light': '#FDE8CC', // fundos suaves
          dark: '#1A1A1A',          // preto tribal
          'dark-muted': '#3D3D3D',  // texto secundário escuro
          cream: '#FFF8F2',         // fundo levíssimo quente
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      animation: {
        'splash-grow': 'splashGrow 1.2s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-in',
      },
      keyframes: {
        splashGrow: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
