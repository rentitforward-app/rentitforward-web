import type { Config } from 'tailwindcss';
import { tailwindColors } from '@rentitforward/shared';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ...tailwindColors,
      },
      fontFamily: {
        primary: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
        secondary: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        sora: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
        manrope: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config; 