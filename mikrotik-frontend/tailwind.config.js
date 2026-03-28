/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-family-main)', 'sans-serif'],
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      typography: {
        article: {
          css: {
            '--tw-prose-body': '#475569', // slate-600
            '--tw-prose-headings': '#0f172a', // slate-900
            '--tw-prose-links': '#2563eb', // blue-600
            '--tw-prose-bold': '#0f172a',
            '--tw-prose-counters': '#2563eb',
            '--tw-prose-bullets': '#2563eb',
            '--tw-prose-quotes': '#0f172a',
            '--tw-prose-code': '#2563eb',
            '--tw-prose-pre-bg': '#020617',
            '--tw-prose-pre-code': '#f8fafc',
            maxWidth: 'none',
            lineHeight: '1.7',
            fontSize: '1.15rem',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            'h2': {
              marginTop: '2.5rem',
              marginBottom: '1.25rem',
              fontWeight: '900',
              fontSize: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              '&::before': {
                content: '""',
                display: 'block',
                width: '0.5rem',
                height: '2.5rem',
                backgroundColor: '#2563eb',
                borderRadius: '9999px',
              },
            },
            'h3': {
              marginTop: '2rem',
              marginBottom: '1rem',
              fontWeight: '800',
              fontSize: '1.85rem',
            },
            'p, div, blockquote, address': {
              marginTop: '0 !important',
              marginBottom: '0 !important',
              lineHeight: '1.7 !important',
            },
            'ul, ol': {
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            'li': {
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
          }
        }
      }
    },
  },
  plugins: [
    typography,
    function({ addComponents }) {
      addComponents({
        '.prose-article pre, .prose-article .ql-syntax, .prose-article .ql-code-block-container': {
          backgroundColor: '#020617 !important',
          color: '#f8fafc !important',
          padding: '2.5rem !important',
          borderRadius: '2rem !important',
          margin: '2rem 0 !important',
          position: 'relative !important',
          display: 'block !important',
          overflowX: 'auto !important',
          border: '1px solid rgba(255, 255, 255, 0.05) !important',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5) !important',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace !important',
          fontSize: '0.95rem !important',
          lineHeight: '1.7 !important',
        },
        '.prose-article code:not(pre code)': {
          backgroundColor: '#f1f5f9 !important',
          color: '#2563eb !important',
          padding: '0.2rem 0.5rem !important',
          borderRadius: '0.6rem !important',
          fontSize: '0.85em !important',
          fontWeight: '800 !important',
        },
        '.prose-article code::before, .prose-article code::after': {
          content: 'none !important',
        },
        '.prose-article img': {
          borderRadius: '2rem !important',
          border: '8px solid white !important',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.1) !important',
          margin: '2.5rem auto !important',
        },
        '.prose-article blockquote': {
          backgroundColor: '#f8fafc !important',
          borderLeft: 'none !important',
          borderRadius: '2.5rem !important',
          padding: '2.5rem !important',
          fontStyle: 'italic !important',
          color: '#0f172a !important',
          position: 'relative !important',
          overflow: 'hidden !important',
        },
        '.prose-article blockquote::after': {
          content: '"“"',
          position: 'absolute',
          top: '-1rem',
          left: '1rem',
          fontSize: '10rem',
          color: '#2563eb',
          opacity: '0.08',
          fontFamily: 'serif',
        }
      })
    }
  ],
}
