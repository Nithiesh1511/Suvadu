/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // `xs` covers small phones (iPhone SE / 360px Androids) where a 2-up grid
      // or a side-by-side form still has to collapse.
      screens: {
        xs: '400px',
      },
      colors: {
        // SUVADU brand palette (from the Dev Brief)
        royal: {
          DEFAULT: '#613092', // Royal Purple
          50: '#F6F1FB',
          100: '#EADDF6',
          200: '#D6BCEC',
          300: '#BB94DD',
          400: '#9A66C7',
          500: '#7D45AE',
          600: '#613092',
          700: '#4E2675',
          800: '#3A1C58',
          900: '#2C1A3E', // Deep Plum
        },
        lilac: '#F3E8FF', // Pale Lilac
        plum: '#2C1A3E', // Deep Plum

        // shadcn-style semantic tokens (map to RGB-channel CSS vars in index.css)
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--primary-foreground) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        light: '300',
        regular: '400',
        medium: '500',
      },
      lineHeight: {
        relaxed: '1.7',
      },
      letterSpacing: {
        cta: '0.06em',
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(97, 48, 146, 0.18)',
        card: '0 6px 24px -10px rgba(44, 26, 62, 0.16)',
        lift: '0 24px 60px -20px rgba(97, 48, 146, 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // A double hop followed by a long rest, rather than Tailwind's built-in
        // animate-bounce which never stops and is tuned for scroll cues. The
        // per-keyframe easing is what makes it read as gravity: decelerating on
        // the way up, accelerating on the way down.
        'bounce-nudge': {
          '0%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
          '8%': { transform: 'translateY(-12px)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '16%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
          '22%': { transform: 'translateY(-5px)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '28%, 100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        marquee: 'marquee 28s linear infinite',
        'bounce-nudge': 'bounce-nudge 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
