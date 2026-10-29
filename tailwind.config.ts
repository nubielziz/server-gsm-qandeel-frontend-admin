// Tailwind 3.4 theme copied from the demo (reference/gsm-admin/tailwind.config.cjs) so the same class means the same pixels.
import type { Config } from 'tailwindcss';

// Colours are CSS variables holding "r g b" triplets, so light/dark themes swap the variables, not the classes.
const c = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        side: c('side'),
        surface: c('surface'),
        sunken: c('sunken'),
        hover: c('hover'),
        line: c('line'),
        line2: c('line2'),
        ink: c('ink'),
        ink2: c('ink2'),
        ink3: c('ink3'),
        accent: c('accent'),
        'accent-ink': c('accent-ink'),
        'accent-soft': c('accent-soft'),
        'good-fg': c('good-fg'),
        'good-bg': c('good-bg'),
        'good-dot': c('good-dot'),
        'warn-fg': c('warn-fg'),
        'warn-bg': c('warn-bg'),
        'warn-dot': c('warn-dot'),
        'serious-fg': c('serious-fg'),
        'serious-bg': c('serious-bg'),
        'serious-dot': c('serious-dot'),
        'crit-fg': c('crit-fg'),
        'crit-bg': c('crit-bg'),
        'crit-dot': c('crit-dot'),
        'neutral-fg': c('neutral-fg'),
        'neutral-bg': c('neutral-bg'),
        'neutral-dot': c('neutral-dot'),
        s1: c('s1'),
        s2: c('s2'),
        s3: c('s3'),
        s4: c('s4'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '14px'],
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        lg: ['16px', '22px'],
        xl: ['18px', '24px'],
        '2xl': ['22px', '28px'],
      },
      borderColor: { DEFAULT: c('line') }, // a bare border-s must never fall back to Tailwind's grey
      borderRadius: { sm: '4px', DEFAULT: '6px', md: '6px', lg: '8px' },
      boxShadow: { pop: '0 12px 32px -8px rgb(0 0 0 / .22), 0 0 0 1px rgb(var(--line2))' },
      keyframes: {
        'slide-in': {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to: { transform: 'none', opacity: '1' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { transform: 'translateY(6px)', opacity: '0' },
          to: { transform: 'none', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
