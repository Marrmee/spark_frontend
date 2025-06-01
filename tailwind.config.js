/** @type {import('tailwindcss').Config} */
// https://uicolors.app/edit?sv1=blue:50-f1f5ff/100-e6edff/200-d0ddff/300-aabeff/400-7a93ff/500-455fff/600-1f32ff/700-0b1dee/800-0a19cd/900-0b17a7/950-031072
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		fontSize: {
  			xs: '0.75rem',
  			'2xs': '0.625rem',
  			'3xs': '0.5rem'
  		},
  		boxShadow: {
  			'glow-seaBlue': '0 0 30px 10px rgba(11, 29, 238, 0.8)',
  			'glow-seaBlue-intermediate': '0 0 15px 5px rgba(11, 29, 238, 0.8)',
  			'glow-seaBlue-limited': '0 0 5px 1.5px rgba(11, 29, 238, 0.8)',
  			'glow-tropicalBlue': '0 0 30px 10px rgba(120, 223, 236, 0.8)',
  			'glow-tropicalBlue-intermediate': '0 0 15px 5px rgba(120, 223, 236, 0.8)',
  			'glow-tropicalBlue-moderate': '0 0 10px 3px rgba(120, 223, 236, 0.8)',
  			'glow-tropicalBlue-limited': '0 0 5px 1.5px rgba(120, 223, 236, 0.8)',
  			'glow-steelBlue-intermediate': '0 0 15px 5px rgba(46, 142, 215, 1)',
  			'glow-fieryRed': '0 0 30px 10px rgba(254, 51, 3, 0.8)',
  			'glow-fieryRed-intermediate': '0 0 15px 5px rgba(254, 51, 3, 0.8)',
  			'glow-fieryRed-limited': '0 0 5px 1.5px rgba(254, 51, 3, 0.8)',
  			'glow-highlightRed-limited': '0 0 5px 1.5px rgba(255, 59, 48, 0.8)',
  			'glow-highlightRed-intermediate': '0 0 15px 5px rgba(255, 59, 48, 0.8)',
  			'glow-seafoamGreen': '0 0 30px 10px rgba(79, 168, 143, 0.8)',
  			'glow-seafoamGreen-intermediate': '0 0 15px 5px rgba(79, 168, 143, 0.8)',
  			'glow-seafoamGreen-limited': '0 0 5px 1.5px rgba(0, 255, 153, 0.3)',
  			'glow-gray': '0 0 30px 10px rgba(128,128,128, 0.8)',
  			'glow-gray-intermediate': '0 0 15px 5px rgba(128,128,128, 0.8)',
  			'glow-neonGreen': '0 0 30px 10px rgba(0, 255, 153, 0.8)',
  			'glow-neonGreen-intermediate': '0 0 15px 5px rgba(0, 255, 153, 0.8)',
  			'glow-neonGreen-limited': '0 0 5px 1.5px rgba(0, 255, 153, 0.8)',
  			'glow-blue-faint': '0 0 10px rgba(45, 127, 234, 0.1)',
  			'glow-blue-strong': '0 0 20px rgba(45, 127, 234, 0.2)',
  			'glow-green-faint': '0 0 10px rgba(76, 215, 155, 0.1)',
  			'glow-purple-faint': '0 0 10px rgba(42, 31, 61, 0.1)',
  			'glow-red-faint': '0 0 10px rgba(255, 78, 78, 0.1)'
  		},
  		fontFamily: {
  			atami: [
  				'var(--font-atamiDisplay)'
  			],
  			proxima: [
  				'var(--font-proximaNova)'
  			],
  			proximaBold: [
  				'var(--font-proximaNovaBold)'
  			],
  			proximaSemiBold: [
  				'var(--font-proximaNovaSemiBold)'
  			],
  			proximaItalic: [
  				'var(--font-proximaNovaItalic)'
  			],
  			acuminMediumItalic: [
  				'var(--font-acuminMediumItalic)'
  			],
  			acuminBold: [
  				'var(--font-acuminBold)'
  			],
  			acuminSemiBold: [
  				'var(--font-acuminSemiBold)'
  			],
  			acuminMedium: [
  				'var(--font-acuminMedium)'
  			]
  		},
  		keyframes: {
  			slideInRight: {
  				'0%': {
  					transform: 'translateX(100%)',
  					opacity: 0
  				},
  				'100%': {
  					transform: 'translateX(0)',
  					opacity: 1
  				}
  			},
  			slideOutRight: {
  				'0%': {
  					transform: 'translateX(0)',
  					opacity: 1
  				},
  				'100%': {
  					transform: 'translateX(100%)',
  					opacity: 0
  				}
  			},
  			progressSlideRight: {
  				'0%': {
  					width: '100%'
  				},
  				'100%': {
  					width: '0%'
  				}
  			},
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			slideIn: {
  				'0%': {
  					transform: 'translate(-50%, -60%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translate(-50%, -50%)',
  					opacity: '1'
  				}
  			},
  			slideUp: {
  				'0%': {
  					transform: 'translateY(100%)'
  				},
  				'100%': {
  					transform: 'translateY(0)'
  				}
  			},
  			'gradient-x': {
  				'0%, 100%': {
  					'background-size': '200% 200%',
  					'background-position': 'left center'
  				},
  				'50%': {
  					'background-size': '200% 200%',
  					'background-position': 'right center'
  				}
  			}
  		},
  		animation: {
  			slideInRight: 'slideInRight 0.3s ease-out',
  			slideOutRight: 'slideOutRight 0.3s ease-in',
  			progressSlideRight: 'progressSlideRight 8s linear',
  			fadeIn: 'fadeIn 0.2s ease-out forwards',
  			slideIn: 'slideIn 0.3s ease-out forwards',
  			slideUp: 'slideUp 0.3s ease-out forwards',
  			'gradient-x': 'gradient-x 10s ease infinite',
  			'pulse-slow': 'pulse 4s ease-in-out infinite',
  			'spin-slow': 'spin 20s linear infinite',
  			'spin-reverse-slow': 'spin 20s linear infinite reverse'
  		},
  		screens: {
  			xs: '280px',
  			'xs+': '350px',
  			'md+': '896px',
  			'lg+': '1152px',
  			'xl+': '1440px',
  			'2xl': '1536px'
  		},
  		colors: {
  			seaBlue: {
  				'50': '#f1f5ff',
  				'100': '#e6edff',
  				'200': '#d0ddff',
  				'300': '#aabeff',
  				'400': '#7a93ff',
  				'500': '#455fff',
  				'600': '#1f32ff',
  				'700': '#0b1dee',
  				'800': '#0a19cd',
  				'900': '#0b17a7',
  				'950': '#031072',
  				'1000': '#020b4f',
  				'1025': '#1A2B6B',
  				'1050': '#010737',
  				'1075': '#000B3B',
  				'1100': '#000314'
  			},
  			steelBlue: '#2E8ED7',
  			tropicalBlue: '#78DFEC',
  			aquaBlue: '#22D6C4',
  			mintGreen: '#A1ECD6',
  			seafoamGreen: '#4FA88F',
  			pineGreen: '#1b9574',
  			forestGreen: '#004832',
  			fieryRed: '#fe3303',
  			highlightRed: '#FF6B6B',
  			neonGreen: '#00FF99',
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
  			}
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
  		},
  		typography: {
  			DEFAULT: {
  				css: {
  					color: '#e6edff',
  					a: {
  						color: '#78DFEC',
  						'&:hover': {
  							color: '#22D6C4'
  						}
  					},
  					h1: {
  						color: '#e6edff'
  					},
  					h2: {
  						color: '#e6edff'
  					},
  					h3: {
  						color: '#e6edff'
  					},
  					strong: {
  						color: '#e6edff'
  					},
  					code: {
  						color: '#78DFEC'
  					},
  					blockquote: {
  						color: '#d0ddff',
  						borderLeftColor: '#455fff'
  					},
  					ul: {
  						li: {
  							'&::marker': {
  								color: '#78DFEC'
  							}
  						}
  					},
  					ol: {
  						li: {
  							'&::marker': {
  								color: '#78DFEC'
  							}
  						}
  					},
  					maxWidth: null
  				}
  			},
  			'full-width': {
  				css: {
  					maxWidth: 'none'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	},
  	variants: {
  		extend: {
  			typography: [
  				'responsive',
  				'hover'
  			],
  			translate: [
  				'responsive',
  				'hover',
  				'focus',
  				'group-hover'
  			],
  			transform: [
  				'responsive',
  				'hover',
  				'focus',
  				'group-hover'
  			],
  			transitionProperty: [
  				'responsive',
  				'motion-safe',
  				'motion-reduce'
  			]
  		}
  	}
  },
  plugins: [
    require('@tailwindcss/typography'),
      require("tailwindcss-animate")
],
};
