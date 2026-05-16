import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'SF Pro Text',
  				'SF Pro Display',
  				'Inter',
  				'system-ui',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'sans-serif'
  			],
  			display: [
  				'New York',
  				'Iowan Old Style',
  				'Palatino',
  				'Merriweather',
  				'Georgia',
  				'serif'
  			],
  			serif: [
  				'New York',
  				'Iowan Old Style',
  				'Palatino',
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'serif'
  			],
  			mono: [
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Space Mono',
  				'Consolas',
  				'monospace'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			activity: {
  				none: 'hsl(var(--activity-none))',
  				low: 'hsl(var(--activity-low))',
  				medium: 'hsl(var(--activity-medium))',
  				high: 'hsl(var(--activity-high))',
  				max: 'hsl(var(--activity-max))'
  			},
  			surface: {
  				elevated: 'hsl(var(--surface-elevated))'
  			},
  			gold: {
  				glow: 'hsl(var(--gold-glow))'
  			},
  			'story-ring': 'hsl(var(--story-ring))',
  			pastel: {
  				yellow: 'hsl(var(--pastel-yellow))',
  				red: 'hsl(var(--pastel-red))',
  				blue: 'hsl(var(--pastel-blue))',
  				green: 'hsl(var(--pastel-green))',
  				purple: 'hsl(var(--pastel-purple))',
  				mint: 'hsl(var(--pastel-mint))',
  				lavender: 'hsl(var(--pastel-lavender))',
  				peach: 'hsl(var(--pastel-peach))',
  				butter: 'hsl(var(--pastel-butter))',
  				sky: 'hsl(var(--pastel-sky))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': { opacity: '0', transform: 'translateY(8px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'scale-in': {
  				'0%': { transform: 'scale(0.96)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' }
  			},
  			'slide-up': {
  				'0%': { transform: 'translateY(100%)' },
  				'100%': { transform: 'translateY(0)' }
  			},
  			'spring-in': {
  				'0%': { transform: 'scale(0.92)', opacity: '0' },
  				'60%': { transform: 'scale(1.02)', opacity: '1' },
  				'100%': { transform: 'scale(1)', opacity: '1' }
  			},
  			'story-progress': {
  				'0%': { width: '0%' },
  				'100%': { width: '100%' }
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
  			'scale-in': 'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  			'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  			'spring-in': 'spring-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
  			'story-progress': 'story-progress 5s linear'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
