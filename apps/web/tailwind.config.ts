import type { Config } from 'tailwindcss';

/**
 * TalentFlow Tailwind config — Phase 0B.
 *
 * All color tokens are HSL channels consumed via hsl(var(--*)).
 * The scale is sourced from `apps/web/src/app/globals.css`; this file
 * only declares the Tailwind utility surface. Do NOT bake literal
 * colors here — they belong in globals.css so tenant branding can
 * override `--brand-h/s/l` at runtime.
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        // ── Semantic shadcn tokens (existing surface) ────────────
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        },

        // ── Brand accent scale (overridable per tenant) ───────────
        brand: {
          50:  'hsl(var(--accent-50))',
          100: 'hsl(var(--accent-100))',
          200: 'hsl(var(--accent-200))',
          300: 'hsl(var(--accent-300))',
          400: 'hsl(var(--accent-400))',
          500: 'hsl(var(--accent-500))',
          600: 'hsl(var(--accent-600))',
          700: 'hsl(var(--accent-700))',
          800: 'hsl(var(--accent-800))',
          900: 'hsl(var(--accent-900))',
          950: 'hsl(var(--accent-950))',
        },

        // ── Neutral scale (constant across tenants) ───────────────
        neutral: {
          50:  'hsl(var(--neutral-50))',
          100: 'hsl(var(--neutral-100))',
          200: 'hsl(var(--neutral-200))',
          300: 'hsl(var(--neutral-300))',
          400: 'hsl(var(--neutral-400))',
          500: 'hsl(var(--neutral-500))',
          600: 'hsl(var(--neutral-600))',
          700: 'hsl(var(--neutral-700))',
          800: 'hsl(var(--neutral-800))',
          900: 'hsl(var(--neutral-900))',
          950: 'hsl(var(--neutral-950))',
        },

        // ── Semantic tones (4 stops each — by design) ─────────────
        success: {
          50:  'hsl(var(--success-50))',
          200: 'hsl(var(--success-200))',
          500: 'hsl(var(--success-500))',
          700: 'hsl(var(--success-700))',
        },
        info: {
          50:  'hsl(var(--info-50))',
          200: 'hsl(var(--info-200))',
          500: 'hsl(var(--info-500))',
          700: 'hsl(var(--info-700))',
        },
        warning: {
          50:  'hsl(var(--warning-50))',
          200: 'hsl(var(--warning-200))',
          500: 'hsl(var(--warning-500))',
          700: 'hsl(var(--warning-700))',
        },
        danger: {
          50:  'hsl(var(--danger-50))',
          200: 'hsl(var(--danger-200))',
          500: 'hsl(var(--danger-500))',
          700: 'hsl(var(--danger-700))',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter-display)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['2.25rem',  { lineHeight: '2.75rem', letterSpacing: '-0.02em',  fontWeight: '700' }],
        'display-xl':  ['1.75rem',  { lineHeight: '2.25rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        h1:            ['1.375rem', { lineHeight: '1.875rem',letterSpacing: '-0.01em',  fontWeight: '600' }],
        h2:            ['1.125rem', { lineHeight: '1.625rem',letterSpacing: '-0.005em', fontWeight: '600' }],
        h3:            ['0.9375rem',{ lineHeight: '1.375rem', fontWeight: '600' }],
        'body-md':     ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'body-sm':     ['0.8125rem',{ lineHeight: '1.25rem',  fontWeight: '400' }],
        'body-xs':     ['0.75rem',  { lineHeight: '1.125rem', fontWeight: '500' }],
        eyebrow:       ['0.6875rem',{ lineHeight: '1rem',     letterSpacing: '0.06em', fontWeight: '600' }],
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',  // 4px
        md: 'calc(var(--radius) - 2px)',  // 6px
        lg: 'var(--radius)',              // 8px (default)
        xl: 'calc(var(--radius) + 4px)',  // 12px
        '2xl': 'calc(var(--radius) + 8px)', // 16px
      },
      boxShadow: {
        xs:    'var(--shadow-xs)',
        sm:    'var(--shadow-sm)',
        md:    'var(--shadow-md)',
        lg:    'var(--shadow-lg)',
        focus: 'var(--shadow-focus)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        shimmer:          'shimmer 1.4s linear infinite',
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
};

export default config;
