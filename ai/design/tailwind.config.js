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
      fontSize: {
        popup: ['11px', { lineHeight: '1.5' }],
        caption: ['10px', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [
    heroui({
      themes: {
        light: {
          layout: {
            fontSize: {
              small: '11px',
              medium: '12px',
              large: '14px',
              tiny: '10px',
            },
            lineHeight: {
              small: '1.5',
              medium: '1.5',
              large: '1.6',
              tiny: '1.4',
            },
            borderWidth: {
              small: '1px',
              medium: '1px',
              large: '2px',
            },
            radius: {
              small: '0.375rem',
              medium: '0.5rem',
              large: '0.75rem',
            },
          },
        },
        dark: {
          layout: {
            fontSize: {
              small: '11px',
              medium: '12px',
              large: '14px',
              tiny: '10px',
            },
            lineHeight: {
              small: '1.5',
              medium: '1.5',
              large: '1.6',
              tiny: '1.4',
            },
            borderWidth: {
              small: '1px',
              medium: '1px',
              large: '2px',
            },
            radius: {
              small: '0.375rem',
              medium: '0.5rem',
              large: '0.75rem',
            },
          },
        },
      },
    }),
  ],
};
