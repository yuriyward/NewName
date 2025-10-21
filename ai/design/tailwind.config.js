import { heroui } from '@heroui/react';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--heroui-background)',
        foreground: 'var(--heroui-foreground)',
      },
      spacing: {
        space: {
          1: 'var(--space-1)',
          2: 'var(--space-2)',
          3: 'var(--space-3)',
          4: 'var(--space-4)',
        },
      },
    },
  },
  plugins: [heroui()],
};
