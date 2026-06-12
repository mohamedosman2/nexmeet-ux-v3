/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8B1A1A',
          light: '#A52A2A',
          dark: '#6B1010',
          hover: '#C03030',
        },
        secondary: {
          DEFAULT: '#1E3A6E',
          light: '#2A4A8A',
          dark: '#152A50',
          hover: '#3b60b5',
        },
        dark: {
          bg: '#0a0a0a',
          bg2: '#111111',
          bg3: '#151515',
          tx: '#e8e8e8',
          tx2: '#888888',
          bd: '#1f1f1f',
          inp: '#111111',
          hv: 'rgba(139, 26, 26, 0.08)',
          ov: 'rgba(0, 0, 0, 0.7)',
          chat: '#0d0d0d',
          bub: '#1e1e1a',
          ph: '#555555',
        },
        light: {
          bg: '#f5f2ed',
          bg2: '#ffffff',
          bg3: '#ffffff',
          tx: '#2c2926',
          tx2: '#7a746e',
          bd: '#e2dfda',
          inp: '#f0ede8',
          hv: 'rgba(139, 26, 26, 0.05)',
          ov: 'rgba(0, 0, 0, 0.35)',
          chat: '#eeebe6',
          bub: '#e0ddd8',
          ph: '#aaaaaa',
        },
        priority: {
          high: '#EF4444',
          medium: '#F59E0B',
          low: '#22C55E',
        },
        status: {
          todo: '#6B7280',
          progress: '#3B82F6',
          done: '#22C55E',
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease',
        'float': 'float 8s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-30px)' },
        },
      },
    },
  },
  plugins: [],
}