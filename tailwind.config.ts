import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      /* ── Neo-Brutal Glass colour tokens ── */
      colors: {
        // shadcn CSS-var colours (keep for component compatibility)
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card:        { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },

        // Design-system raw tokens
        ink:    'var(--ink)',
        paper:  'var(--paper)',
        violet: 'var(--violet)',
        yellow: 'var(--yellow)',
        pink:   'var(--pink)',
        teal:   'var(--teal)',
        red:    'var(--red)',

        // Subject palette
        subject: {
          1: '#6C5CE7',
          2: '#FF6B9D',
          3: '#2DD4BF',
          4: '#FFD43B',
          5: '#FF7043',
          6: '#00B4D8',
        },
      },

      /* ── Typography ── */
      fontFamily: {
        heading: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      /* ── Border radius ── */
      borderRadius: {
        brutal:  '12px',   // interactive elements
        chip:    '8px',    // chips / badges
        glass:   '22px',   // glass panels
        lg:      'var(--radius)',
        md:      'calc(var(--radius) - 2px)',
        sm:      'calc(var(--radius) - 4px)',
      },

      /* ── Box shadows ── */
      boxShadow: {
        brutal:       '4px 4px 0 var(--ink)',
        'brutal-lg':  '6px 6px 0 var(--ink)',
        'brutal-sm':  '2px 2px 0 var(--ink)',
        'brutal-v':   '4px 4px 0 var(--violet)',  // violet variant for inputs
        none:         'none',
      },

      /* ── Backdrop blur ── */
      backdropBlur: {},

      /* ── Keyframes ── */
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        drift1: {
          '0%':   { transform: 'translate(0px,   0px)   scale(1)' },
          '100%': { transform: 'translate(60px,  40px)  scale(1.1)' },
        },
        drift2: {
          '0%':   { transform: 'translate(0px,   0px)   scale(1)' },
          '100%': { transform: 'translate(-50px, 60px)  scale(0.95)' },
        },
        drift3: {
          '0%':   { transform: 'translate(0px,  0px)    scale(1)' },
          '100%': { transform: 'translate(40px, -50px)  scale(1.05)' },
        },
        drift4: {
          '0%':   { transform: 'translate(0px,  0px)    scale(1)' },
          '100%': { transform: 'translate(-30px, 30px)  scale(1.08)' },
        },
        stamp: {
          '0%':   { opacity: '0', transform: 'rotate(-12deg) scale(0.5)' },
          '60%':  { opacity: '1', transform: 'rotate(-12deg) scale(1.1)' },
          '100%': { opacity: '1', transform: 'rotate(-12deg) scale(1)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.9' },
        },
        'fade-rise': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        drift1:    'drift1 25s ease-in-out infinite alternate',
        drift2:    'drift2 30s ease-in-out infinite alternate',
        drift3:    'drift3 22s ease-in-out infinite alternate',
        drift4:    'drift4 28s ease-in-out infinite alternate',
        stamp:     'stamp 250ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        shimmer:   'shimmer 1.6s ease-in-out infinite',
        'fade-rise': 'fade-rise 200ms ease-out both',
      },
    },
  },
  plugins: [animate],
}

export default config
