
import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
            pathCircle: {
              '25%': { strokeDashoffset: '125' },
              '50%': { strokeDashoffset: '175' },
              '75%': { strokeDashoffset: '225' },
              '100%': { strokeDashoffset: '275' },
            },
            dotRect: {
                '25%': { transform: 'translate(0, 0)' },
                '50%': { transform: 'translate(18px, -18px)' },
                '75%': { transform: 'translate(0, -36px)' },
                '100%': { transform: 'translate(-18px, -18px)' },
            },
            'download-line': {
              '5%, 10%': { transform: 'translateY(-30px)' },
              '40%': { transform: 'translateY(-20px)' },
              '65%': { transform: 'translateY(0)' },
              '75%, 100%': { transform: 'translateY(30px)' },
            },
            'download-svg': {
              '0%, 20%': { 'stroke-dasharray': '0', 'stroke-dashoffset': '0', opacity: '1' },
              '21%, 89%': { 'stroke-dasharray': '26px', 'stroke-dashoffset': '26px', 'stroke-width': '3px', opacity: '0' },
              '90%, 100%': { 'stroke-dasharray': '26px', 'stroke-dashoffset': '0', 'stroke-width': '2px', opacity: '1' },
            },
            'download-background': {
              '10%': { transform: 'scaleY(0)', 'border-radius': '0 0 0 0' },
              '40%': { transform: 'scaleY(0.15)', 'border-radius': '0 0 0 0' },
              '65%': { transform: 'scaleY(0.5)', 'border-radius': '0 0 80% 80%' },
              '75%': { transform: 'scaleY(1)', 'border-radius': '0 0 50% 50%' },
              '90%, 100%': { transform: 'scaleY(1)', 'border-radius': '0 0 0 0' },
            },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
            'pathCircle': 'pathCircle 3s cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite',
            'dotRect': 'dotRect 3s cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite',
            'line': 'download-line 3s linear forwards 195ms',
            'svg': 'download-svg 3s linear forwards 195ms',
            'background': 'download-background 3s linear forwards 195ms',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
