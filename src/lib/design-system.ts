// Web Design System Implementation
// Integrates the shared design system with web-specific functionality

// For now, we'll define the design tokens locally until the shared package is properly linked
// TODO: Import from '@rentitforward/shared' once package linking is set up

// Temporary local definitions
const designTokens = {
  colors: {
    primary: '#22c55e',
    secondary: '#343c3e',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  }
}

const lightTheme = {
  mode: 'light' as const,
  colors: designTokens.colors,
  typography: {
    displayLarge: { fontSize: 64, lineHeight: '1.1' },
    displayMedium: { fontSize: 48, lineHeight: '1.2' },
    displaySmall: { fontSize: 36, lineHeight: '1.2' },
    headlineLarge: { fontSize: 32, lineHeight: '1.3' },
    headlineMedium: { fontSize: 28, lineHeight: '1.3' },
    headlineSmall: { fontSize: 24, lineHeight: '1.3' },
    titleLarge: { fontSize: 20, lineHeight: '1.4' },
    titleMedium: { fontSize: 18, lineHeight: '1.4' },
    titleSmall: { fontSize: 16, lineHeight: '1.4' },
    bodyLarge: { fontSize: 18, lineHeight: '1.5' },
    bodyMedium: { fontSize: 16, lineHeight: '1.5' },
    bodySmall: { fontSize: 14, lineHeight: '1.5' },
    labelLarge: { fontSize: 16, lineHeight: '1.4' },
    labelMedium: { fontSize: 14, lineHeight: '1.4' },
    labelSmall: { fontSize: 12, lineHeight: '1.4' },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
    '4xl': 80,
    '5xl': 96,
    '6xl': 128,
  },
  breakpoints: {
    mobile: 480,
    tablet: 768,
    tabletLandscape: 992,
    desktop: 1200,
    wide: 1440,
  },
  components: {}
}

const darkTheme = { ...lightTheme, mode: 'dark' as const }

type Theme = typeof lightTheme | typeof darkTheme
type ThemeContextValue = {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  setTheme: (mode: 'light' | 'dark') => void
}

const getTheme = (mode: 'light' | 'dark') => mode === 'dark' ? darkTheme : lightTheme
const generateTokenVariables = (mode: 'light' | 'dark') => ({
  '--color-primary': designTokens.colors.primary,
  '--color-secondary': designTokens.colors.secondary,
})
const webTokens = designTokens
import { createContext, useContext } from 'react'

// Theme Context for React
export const ThemeContext = createContext<ThemeContextValue | null>(null)

// Custom hook to use theme
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// CSS-in-JS utilities for styled-components or emotion
export const createStyledTheme = (theme: Theme) => ({
  colors: theme.colors,
  typography: theme.typography,
  spacing: theme.spacing,
  breakpoints: theme.breakpoints,
  components: theme.components,
  
  // Helper functions for styled-components
  color: (name: keyof typeof theme.colors) => theme.colors[name],
  space: (size: keyof typeof theme.spacing) => `${theme.spacing[size]}px`,
  text: (style: keyof typeof theme.typography) => theme.typography[style],
  
  // Media query helpers
  media: {
    mobile: `@media (max-width: ${theme.breakpoints.tablet - 1}px)`,
    tablet: `@media (min-width: ${theme.breakpoints.tablet}px) and (max-width: ${theme.breakpoints.desktop - 1}px)`,
    desktop: `@media (min-width: ${theme.breakpoints.desktop}px)`,
    up: (breakpoint: keyof typeof theme.breakpoints) => 
      `@media (min-width: ${theme.breakpoints[breakpoint]}px)`,
    down: (breakpoint: keyof typeof theme.breakpoints) => 
      `@media (max-width: ${theme.breakpoints[breakpoint] - 1}px)`,
  }
})

// Tailwind CSS configuration generator
export const generateTailwindConfig = (theme: Theme) => ({
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: theme.colors.primary,
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: theme.colors.secondary,
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        gray: {
          50: theme.colors.gray50,
          100: theme.colors.gray100,
          200: theme.colors.gray200,
          300: theme.colors.gray300,
          400: theme.colors.gray400,
          500: theme.colors.gray500,
          600: theme.colors.gray600,
          700: theme.colors.gray700,
          800: theme.colors.gray800,
          900: theme.colors.gray900,
        },
        success: theme.colors.success,
        warning: theme.colors.warning,
        error: theme.colors.error,
        info: theme.colors.info,
      },
      fontFamily: {
        sora: ['Sora', 'system-ui', 'sans-serif'],
        manrope: ['Manrope', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': [`${theme.typography.displayLarge.fontSize}px`, `${theme.typography.displayLarge.lineHeight}`],
        'display-md': [`${theme.typography.displayMedium.fontSize}px`, `${theme.typography.displayMedium.lineHeight}`],
        'display-sm': [`${theme.typography.displaySmall.fontSize}px`, `${theme.typography.displaySmall.lineHeight}`],
        'headline-lg': [`${theme.typography.headlineLarge.fontSize}px`, `${theme.typography.headlineLarge.lineHeight}`],
        'headline-md': [`${theme.typography.headlineMedium.fontSize}px`, `${theme.typography.headlineMedium.lineHeight}`],
        'headline-sm': [`${theme.typography.headlineSmall.fontSize}px`, `${theme.typography.headlineSmall.lineHeight}`],
        'title-lg': [`${theme.typography.titleLarge.fontSize}px`, `${theme.typography.titleLarge.lineHeight}`],
        'title-md': [`${theme.typography.titleMedium.fontSize}px`, `${theme.typography.titleMedium.lineHeight}`],
        'title-sm': [`${theme.typography.titleSmall.fontSize}px`, `${theme.typography.titleSmall.lineHeight}`],
        'body-lg': [`${theme.typography.bodyLarge.fontSize}px`, `${theme.typography.bodyLarge.lineHeight}`],
        'body-md': [`${theme.typography.bodyMedium.fontSize}px`, `${theme.typography.bodyMedium.lineHeight}`],
        'body-sm': [`${theme.typography.bodySmall.fontSize}px`, `${theme.typography.bodySmall.lineHeight}`],
        'label-lg': [`${theme.typography.labelLarge.fontSize}px`, `${theme.typography.labelLarge.lineHeight}`],
        'label-md': [`${theme.typography.labelMedium.fontSize}px`, `${theme.typography.labelMedium.lineHeight}`],
        'label-sm': [`${theme.typography.labelSmall.fontSize}px`, `${theme.typography.labelSmall.lineHeight}`],
      },
      spacing: {
        'xs': `${theme.spacing.xs}px`,
        'sm': `${theme.spacing.sm}px`,
        'md': `${theme.spacing.md}px`,
        'lg': `${theme.spacing.lg}px`,
        'xl': `${theme.spacing.xl}px`,
        '2xl': `${theme.spacing['2xl']}px`,
        '3xl': `${theme.spacing['3xl']}px`,
        '4xl': `${theme.spacing['4xl']}px`,
        '5xl': `${theme.spacing['5xl']}px`,
        '6xl': `${theme.spacing['6xl']}px`,
      },
      screens: {
        'sm': `${theme.breakpoints.mobile}px`,
        'md': `${theme.breakpoints.tablet}px`,
        'lg': `${theme.breakpoints.tabletLandscape}px`,
        'xl': `${theme.breakpoints.desktop}px`,
        '2xl': `${theme.breakpoints.wide}px`,
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
})

// CSS Custom Properties injection
export const injectThemeVariables = (theme: Theme) => {
  const variables = generateTokenVariables(theme.mode)
  const root = document.documentElement
  
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value)
  })
}

// Component style generators
export const createButtonClasses = (variant: 'primary' | 'secondary' | 'outline' | 'text' = 'primary') => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 shadow-sm',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
    text: 'text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
  }
  
  return `${baseClasses} ${variantClasses[variant]}`
}

export const createCardClasses = (variant: 'default' | 'elevated' | 'outlined' = 'default') => {
  const baseClasses = 'bg-white rounded-lg transition-all duration-200'
  
  const variantClasses = {
    default: 'border border-gray-200 shadow-sm hover:shadow-md',
    elevated: 'shadow-md hover:shadow-lg',
    outlined: 'border-2 border-gray-300 hover:border-primary-500',
  }
  
  return `${baseClasses} ${variantClasses[variant]}`
}

// Responsive utilities
export const useBreakpoint = () => {
  // This would be implemented with a proper hook that listens to window resize
  // For now, returning a placeholder
  return {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    current: 'desktop' as const,
  }
}

// Export theme instances and utilities
export {
  lightTheme,
  darkTheme,
  getTheme,
  designTokens,
  generateTokenVariables,
  webTokens,
}

// Export types
export type { Theme, ThemeContextValue }
