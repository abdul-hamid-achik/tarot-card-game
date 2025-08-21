import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import pixelDimensions from 'tailwindcss-pixel-dimensions';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
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
        // Enhanced 8-bit Pixel Art Color Palette
        pixel: {
          // Classic 8-bit colors
          black: '#000000',
          white: '#FFFFFF',
          gray: {
            1: '#111111',
            2: '#222222',
            3: '#333333',
            4: '#444444',
            5: '#555555',
            6: '#666666',
            7: '#777777',
            8: '#888888',
            9: '#999999',
            10: '#AAAAAA',
            11: '#BBBBBB',
            12: '#CCCCCC',
            13: '#DDDDDD',
            14: '#EEEEEE',
          },
          // Retro game colors
          red: {
            dark: '#7F0000',
            DEFAULT: '#FF0000',
            light: '#FF7F7F',
            bright: '#FF3F3F',
          },
          green: {
            dark: '#007F00',
            DEFAULT: '#00FF00',
            light: '#7FFF7F',
            bright: '#3FFF3F',
          },
          blue: {
            dark: '#00007F',
            DEFAULT: '#0000FF',
            light: '#7F7FFF',
            bright: '#3F3FFF',
          },
          yellow: {
            dark: '#7F7F00',
            DEFAULT: '#FFFF00',
            light: '#FFFF7F',
            bright: '#FFFF3F',
          },
          magenta: {
            dark: '#7F007F',
            DEFAULT: '#FF00FF',
            light: '#FF7FFF',
            bright: '#FF3FFF',
          },
          cyan: {
            dark: '#007F7F',
            DEFAULT: '#00FFFF',
            light: '#7FFFFF',
            bright: '#3FFFFF',
          },
          orange: {
            dark: '#7F3F00',
            DEFAULT: '#FF7F00',
            light: '#FFBF7F',
            bright: '#FF9F3F',
          },
          purple: {
            dark: '#3F007F',
            DEFAULT: '#7F00FF',
            light: '#BF7FFF',
            bright: '#9F3FFF',
          },
          pink: {
            dark: '#7F003F',
            DEFAULT: '#FF007F',
            light: '#FF7FBF',
            bright: '#FF3F9F',
          },
          brown: {
            dark: '#3F1F00',
            DEFAULT: '#7F3F00',
            light: '#BF7F3F',
            bright: '#9F5F1F',
          },
        },
        // Enhanced 8-bit Pixel Art Color Palette
        pixel: {
          // Classic 8-bit colors
          black: '#000000',
          white: '#FFFFFF',
          gray: {
            1: '#111111',
            2: '#222222',
            3: '#333333',
            4: '#444444',
            5: '#555555',
            6: '#666666',
            7: '#777777',
            8: '#888888',
            9: '#999999',
            10: '#AAAAAA',
            11: '#BBBBBB',
            12: '#CCCCCC',
            13: '#DDDDDD',
            14: '#EEEEEE',
          },
          // Retro game colors
          red: {
            dark: '#7F0000',
            DEFAULT: '#FF0000',
            light: '#FF7F7F',
            bright: '#FF3F3F',
          },
          green: {
            dark: '#007F00',
            DEFAULT: '#00FF00',
            light: '#7FFF7F',
            bright: '#3FFF3F',
          },
          blue: {
            dark: '#00007F',
            DEFAULT: '#0000FF',
            light: '#7F7FFF',
            bright: '#3F3FFF',
          },
          yellow: {
            dark: '#7F7F00',
            DEFAULT: '#FFFF00',
            light: '#FFFF7F',
            bright: '#FFFF3F',
          },
          magenta: {
            dark: '#7F007F',
            DEFAULT: '#FF00FF',
            light: '#FF7FFF',
            bright: '#FF3FFF',
          },
          cyan: {
            dark: '#007F7F',
            DEFAULT: '#00FFFF',
            light: '#7FFFFF',
            bright: '#3FFFFF',
          },
          orange: {
            dark: '#7F3F00',
            DEFAULT: '#FF7F00',
            light: '#FFBF7F',
            bright: '#FF9F3F',
          },
          purple: {
            dark: '#3F007F',
            DEFAULT: '#7F00FF',
            light: '#BF7FFF',
            bright: '#9F3FFF',
          },
          pink: {
            dark: '#7F003F',
            DEFAULT: '#FF007F',
            light: '#FF7FBF',
            bright: '#FF3F9F',
          },
          brown: {
            dark: '#3F1F00',
            DEFAULT: '#7F3F00',
            light: '#BF7F3F',
            bright: '#9F5F1F',
          },
        },
        // Enhanced Tarot-themed colors with pixel art aesthetics
        tarot: {
          gold: '#D4AF37',
          silver: '#C0C0C0',
          bronze: '#CD7F32',
          mystic: {
            purple: '#6B46C1',
            violet: '#8B5CF6',
            indigo: '#4C1D95',
          },
          suits: {
            wands: '#EF4444', // Red/Fire
            cups: '#3B82F6',  // Blue/Water
            swords: '#A855F7', // Purple/Air
            pentacles: '#10B981', // Green/Earth
            major: '#F59E0B', // Amber/Gold
          },
          board: {
            dark: '#0F0A1F',
            medium: '#1A1333',
            light: '#2D2147',
          },
        },
      },
      // Pixel-perfect spacing and sizing
      spacing: {
        'px-1': '1px',
        'px-2': '2px',
        'px-3': '3px',
        'px-4': '4px',
        'px-5': '5px',
        'px-6': '6px',
        'px-7': '7px',
        'px-8': '8px',
        'px-9': '9px',
        'px-10': '10px',
        'px-12': '12px',
        'px-14': '14px',
        'px-16': '16px',
        'px-18': '18px',
        'px-20': '20px',
        'px-24': '24px',
        'px-28': '28px',
        'px-32': '32px',
        'px-36': '36px',
        'px-40': '40px',
        'px-48': '48px',
        'px-56': '56px',
        'px-64': '64px',
        'px-72': '72px',
        'px-80': '80px',
        'px-96': '96px',
      },
      backgroundImage: {
        'tarot-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'mystic-gradient': 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
        'card-shine': 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)',
        // Pixel art backgrounds
        'pixel-grid': 'repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(255,255,255,0.05) 8px, rgba(255,255,255,0.05) 8px), repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.05) 8px, rgba(255,255,255,0.05) 8px)',
        'pixel-dots': 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
        'pixel-dots-dense': 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
        'scanlines': 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 2px)',
        'crt-screen': 'linear-gradient(rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.05) 50%), radial-gradient(circle at center, rgba(255,255,255,0.02) 0%, transparent 70%)',
        'pixel-mosaic': 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.03) 0deg 90deg, transparent 90deg 180deg, rgba(255,255,255,0.03) 180deg 270deg, transparent 270deg 360deg)',
      },
      boxShadow: {
        'tarot': '0 10px 40px rgba(107, 70, 193, 0.3)',
        'card-glow': '0 0 30px rgba(212, 175, 55, 0.4)',
        'mystic': '0 0 50px rgba(139, 92, 246, 0.3)',
        // Pixel art shadows
        'pixel-1': '1px 1px 0px rgba(0,0,0,0.8)',
        'pixel-2': '2px 2px 0px rgba(0,0,0,0.8)',
        'pixel-3': '3px 3px 0px rgba(0,0,0,0.8)',
        'pixel-4': '4px 4px 0px rgba(0,0,0,0.8)',
        'pixel-inset': 'inset 2px 2px 0px rgba(0,0,0,0.8), inset -2px -2px 0px rgba(255,255,255,0.1)',
        'pixel-glow-red': '0 0 5px rgba(255,0,0,0.8), 0 0 10px rgba(255,0,0,0.4)',
        'pixel-glow-blue': '0 0 5px rgba(0,0,255,0.8), 0 0 10px rgba(0,0,255,0.4)',
        'pixel-glow-green': '0 0 5px rgba(0,255,0,0.8), 0 0 10px rgba(0,255,0,0.4)',
        'pixel-glow-yellow': '0 0 5px rgba(255,255,0,0.8), 0 0 10px rgba(255,255,0,0.4)',
        'pixel-neon': '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.4), 0 0 6px rgba(255,255,255,0.2)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Pixel art border radius
        'px-1': '1px',
        'px-2': '2px',
        'px-3': '3px',
        'px-4': '4px',
        'px-6': '6px',
        'px-8': '8px',
      },
      fontSize: {
        // Pixel-perfect font sizes
        'px-6': '6px',
        'px-8': '8px',
        'px-10': '10px',
        'px-12': '12px',
        'px-14': '14px',
        'px-16': '16px',
        'px-18': '18px',
        'px-20': '20px',
        'px-24': '24px',
        'px-28': '28px',
        'px-32': '32px',
        'px-36': '36px',
        'px-40': '40px',
        'px-48': '48px',
      },
      fontSize: {
        // Pixel-perfect font sizes
        'px-6': '6px',
        'px-8': '8px',
        'px-10': '10px',
        'px-12': '12px',
        'px-14': '14px',
        'px-16': '16px',
        'px-18': '18px',
        'px-20': '20px',
        'px-24': '24px',
        'px-28': '28px',
        'px-32': '32px',
        'px-36': '36px',
        'px-40': '40px',
        'px-48': '48px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'pixel-scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pixel-glitch': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%': { transform: 'translateX(-2px)' },
          '20%': { transform: 'translateX(2px)' },
          '30%': { transform: 'translateX(-1px)' },
          '40%': { transform: 'translateX(1px)' },
          '50%': { transform: 'translateX(0)' },
        },
        'pixel-typewriter': {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        'pixel-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-1px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(1px)' },
        },
        'pixel-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pixel-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.7)' },
          '50%': { boxShadow: '0 0 0 4px rgba(255,255,255,0)' },
        },
        'pixel-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pixel-scale': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'pixel-fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pixel-fade-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        'pixel-slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pixel-slide-down': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pixel-slide-left': {
          '0%': { transform: 'translateX(8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pixel-slide-right': {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pixel-scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pixel-glitch': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%': { transform: 'translateX(-2px)' },
          '20%': { transform: 'translateX(2px)' },
          '30%': { transform: 'translateX(-1px)' },
          '40%': { transform: 'translateX(1px)' },
          '50%': { transform: 'translateX(0)' },
        },
        'pixel-typewriter': {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        'pixel-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-1px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(1px)' },
        },
        'pixel-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pixel-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.7)' },
          '50%': { boxShadow: '0 0 0 4px rgba(255,255,255,0)' },
        },
        'pixel-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pixel-scale': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'pixel-fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pixel-fade-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        'pixel-slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pixel-slide-down': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pixel-slide-left': {
          '0%': { transform: 'translateX(8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pixel-slide-right': {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'card-float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        // Pixel art animations
        'pixel-flicker': 'pixel-flicker 0.1s ease-in-out infinite',
        'pixel-blink': 'pixel-blink 1s ease-in-out infinite',
        'pixel-scanline': 'pixel-scanline 0.1s linear infinite',
        'pixel-glitch': 'pixel-glitch 0.3s ease-in-out',
        'pixel-typewriter': 'pixel-typewriter 2s steps(40, end)',
        'pixel-shake': 'pixel-shake 0.5s ease-in-out',
        'pixel-bounce': 'pixel-bounce 0.3s ease-in-out',
        'pixel-pulse': 'pixel-pulse 2s ease-in-out infinite',
        'pixel-rotate': 'pixel-rotate 2s linear infinite',
        'pixel-scale': 'pixel-scale 0.2s ease-in-out',
        'pixel-fade-in': 'pixel-fade-in 0.3s ease-out',
        'pixel-fade-out': 'pixel-fade-out 0.3s ease-in',
        'pixel-slide-up': 'pixel-slide-up 0.3s ease-out',
        'pixel-slide-down': 'pixel-slide-down 0.3s ease-out',
        'pixel-slide-left': 'pixel-slide-left 0.3s ease-out',
        'pixel-slide-right': 'pixel-slide-right 0.3s ease-out',
      },
    },
  },
  plugins: [animate, pixelDimensions],
};

export default config;
