/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vibrant gradient colors - blue to purple/magenta to orange-red to yellow-orange to cream
        gradient: {
          cream: '#FEF3C7',      // Soft cream/off-white (bottom-left)
          yellowOrange: '#F59E0B', // Yellow-orange
          orange: '#F97316',     // Orange-red
          orangeRed: '#FF6B35',  // Vibrant orange-red
          magenta: '#A855F7',    // Purple/magenta
          purple: '#7C3AED',     // Rich purple
          bluePurple: '#6366F1', // Blue-purple
          deepBlue: '#1E40AF',   // Deep blue (top-right)
        },
        // Base colors - pure white background
        base: {
          white: '#ffffff',
          light: '#ffffff',
          surface: '#ffffff',
          elevated: '#ffffff',
        },
        // Accent colors - vibrant gradient palette
        accent: {
          cream: '#FEF3C7',
          yellowOrange: '#F59E0B',
          orange: '#F97316',
          orangeRed: '#FF6B35',
          magenta: '#A855F7',
          purple: '#7C3AED',
          bluePurple: '#6366F1',
          deepBlue: '#1E40AF',
        },
        // Text colors - soft dark on pure white
        text: {
          primary: '#1a1a1a',
          secondary: '#5a5a5a',
          tertiary: '#9a9a9a',
        },
        // Legacy colors (for compatibility)
        pearl: '#f5f5f0',
        linen: '#e6e1d8',
        shale: '#b8b1a6',
        graphite: '#3b3f47',
        ink: '#171c24',
        amber: '#f6c177',
        mist: '#eef0f4',
      },
      fontFamily: {
        sans: ['"Sora"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        board: '0 30px 60px rgba(15, 18, 24, 0.12)',
        soft: '0 15px 30px rgba(15, 18, 24, 0.08)',
        pill: '0 10px 20px rgba(15, 18, 24, 0.15)',
      },
      animation: {
        float: 'float 10s ease-in-out infinite',
        fade: 'fade 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(-4px)' },
          '50%': { transform: 'translateY(4px)' },
        },
        fade: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

