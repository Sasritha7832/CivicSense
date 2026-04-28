/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030712',
        card: '#111827',
        border: '#1f2937',
        text: {
          primary: '#f9fafb',
          muted: '#6b7280',
        },
        accent: {
          blue: '#2563eb',
        },
        civic: {
          open: '#ef4444',
          in_progress: '#f59e0b',
          resolved: '#22c55e',
          rejected: '#6b7280',
        }
      },
      boxShadow: {
        'accent-glow': '0 0 20px rgba(37, 99, 235, 0.4)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.4)' }, '50%': { boxShadow: '0 0 0 10px rgba(37, 99, 235, 0)' } },
        slideInRight: { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
