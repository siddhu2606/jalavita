import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Surfaces (very dark navy/charcoal) ──────────────────────────────
        surface: {
          DEFAULT:             '#0d0f14',   // main page bg
          dim:                 '#0d0f14',
          bright:              '#252932',
          variant:             '#1e2330',
          tint:                '#3dd6b0',
          'container-lowest':  '#080a0e',   // terminal / deepest bg
          'container-low':     '#0f1219',   // sidebar bg
          'container':         '#131720',   // card bg
          'container-high':    '#1a1f2b',   // elevated card
          'container-highest': '#222838',   // tooltips / modals
        },

        // ── Text ────────────────────────────────────────────────────────────
        'on-surface': {
          DEFAULT: '#d0d4e0',              // primary text (cool grey-white)
          variant: '#7a8299',              // muted text
        },
        'inverse-surface':    '#d0d4e0',
        'inverse-on-surface': '#1a1f2b',

        // ── Primary (soft slate-blue for accents) ────────────────────────────
        primary: {
          DEFAULT:     '#8eb4e8',
          container:   '#162438',
          fixed:       '#cce0ff',
          'fixed-dim': '#8eb4e8',
        },
        'on-primary': {
          DEFAULT:        '#0a1e34',
          container:      '#6a96c4',
          fixed:          '#001428',
          'fixed-variant':'#1e3a58',
        },
        'inverse-primary': '#4a7aaa',

        // ── Secondary (orange – emergency / warnings) ────────────────────────
        secondary: {
          DEFAULT:     '#ffb080',
          container:   '#ff6b00',
          fixed:       '#ffdcc4',
          'fixed-dim': '#ffb080',
        },
        'on-secondary': {
          DEFAULT:        '#4a1800',
          container:      '#7a2800',
          fixed:          '#2a0e00',
          'fixed-variant':'#6a2000',
        },

        // ── Tertiary (teal-green – the bright accent from the screenshot) ────
        tertiary: {
          DEFAULT:     '#00d4a8',          // bright teal-green
          container:   '#003d30',
          fixed:       '#80ffe8',
          'fixed-dim': '#00d4a8',
        },
        'on-tertiary': {
          DEFAULT:        '#002820',
          container:      '#00c49a',
          fixed:          '#001c16',
          'fixed-variant':'#004838',
        },

        // ── Error / Crisis (red) ─────────────────────────────────────────────
        error: {
          DEFAULT:   '#ff6b6b',
          container: '#8a0010',
        },
        'on-error': {
          DEFAULT:   '#5a0008',
          container: '#ffd6d6',
        },

        // ── Outlines / borders ───────────────────────────────────────────────
        outline: {
          DEFAULT: '#4a5068',
          variant: '#262c3e',
        },

        background:    '#0d0f14',
        'on-background': '#d0d4e0',

        // ── Semantic aliases (keep existing names working) ───────────────────
        'deep-navy':       '#0d0f14',
        'ocean-blue':      '#162438',
        'emergency-orange':'#ff6b00',
        'tech-cyan':       '#00d4a8',      // remapped to teal-green
        'arctic-white':    '#d0d4e0',
        'crimson-red':     '#e63946',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Inter', 'monospace'],
      },

      fontSize: {
        'headline-lg':        ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-md':        ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-lg':            ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md':            ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm':            ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-caps':         ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '700' }],
        'mono-data':          ['13px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '500' }],
      },

      borderRadius: {
        DEFAULT: '0.375rem',
        lg:      '0.625rem',
        xl:      '0.875rem',
        '2xl':   '1.125rem',
        '3xl':   '1.5rem',
      },

      spacing: {
        unit:              '4px',
        gutter:            '16px',
        'margin-mobile':   '16px',
        'margin-desktop':  '32px',
        'container-max-width': '1440px',
      },

      maxWidth: {
        container: '1440px',
      },

      animation: {
        'sweep':         'sweep 4s linear infinite',
        'pulse-ring':    'pulse-ring 2s ease-out infinite',
        'flash-warning': 'flash-warning 1s ease-in-out infinite',
        'slide-up':      'slide-up 0.5s ease-out',
        'fade-in':       'fade-in 0.5s ease-out',
        'glow':          'glow 2s ease-in-out infinite alternate',
      },

      keyframes: {
        sweep: {
          '0%':   { transform: 'translate(-50%, -50%) rotate(0deg)' },
          '100%': { transform: 'translate(-50%, -50%) rotate(360deg)' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'flash-warning': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(0, 212, 168, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 168, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
