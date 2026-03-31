/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
      },
      colors: {
        'ig-blue': '#0095F6',
        'ig-primary': '#262626',
        'ig-secondary': '#8E8E8E',
        'ig-muted': '#C7C7C7',
        'ig-border': '#DBDBDB',
        'ig-bg': '#FAFAFA',
        'ig-bg-light': '#F5F5F5',
        'ig-white': '#FFFFFF',
        'ig-black': '#000000',
        'ig-error': '#ED4956',
        gradient: {
          'story': 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
        }
      },
      boxShadow: {
        'ig-card': '0 0 0 1px rgba(219,219,219,1)',
        'ig-profile': '0 0 0 3px rgba(255,255,255,0.8)',
      },
      animation: {
        'heart-beat': 'heartBeat 0.3s ease-in-out',
        'like-pop': 'likePop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        heartBeat: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        likePop: {
          '0%': { transform: 'scale(0) rotate(180deg)', opacity: 0 },
          '50%': { transform: 'scale(1.2) rotate(0deg)', opacity: 1 },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: 1 },
        }
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
