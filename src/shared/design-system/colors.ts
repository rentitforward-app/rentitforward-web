// Color System - Brand Colors, Utility Colors, and Accent Colors
// Based on the green branding of Rent It Forward

export interface ColorPalette {
  // Brand Colors
  primary: string
  secondary: string
  tertiary: string
  alternate: string
  
  // Utility Colors
  primaryText: string
  secondaryText: string
  primaryBackground: string
  secondaryBackground: string
  
  // Accent Colors
  accent1: string
  accent2: string
  accent3: string
  accent4: string
  
  // Semantic Colors
  success: string
  warning: string
  error: string
  info: string
  
  // Neutral Colors
  white: string
  black: string
  gray50: string
  gray100: string
  gray200: string
  gray300: string
  gray400: string
  gray500: string
  gray600: string
  gray700: string
  gray800: string
  gray900: string
}

// Light Mode Theme Colors
export const lightColors: ColorPalette = {
  // Brand Colors - Green Theme
  primary: '#22c55e',      // Green 500 - Main brand color
  secondary: '#343c3e',    // Dark gray for text/headers
  tertiary: '#136806',     // Dark green for accents
  alternate: '#ffffff',    // White for backgrounds
  
  // Utility Colors
  primaryText: '#111827',     // Gray 900 - Main text
  secondaryText: '#6b7280',   // Gray 500 - Secondary text
  primaryBackground: '#ffffff', // White background
  secondaryBackground: '#f9fafb', // Gray 50 - Light background
  
  // Accent Colors
  accent1: '#37b02a',      // Green accent
  accent2: '#0d6efd',      // Blue accent
  accent3: '#ffc107',      // Yellow accent
  accent4: '#f3f4f6',      // Light gray accent
  
  // Semantic Colors
  success: '#10b981',      // Green 500
  warning: '#f59e0b',      // Amber 500
  error: '#ef4444',        // Red 500
  info: '#3b82f6',         // Blue 500
  
  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
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
}

// Dark Mode Theme Colors
export const darkColors: ColorPalette = {
  // Brand Colors - Adjusted for dark mode
  primary: '#22c55e',      // Keep green consistent
  secondary: '#f9fafb',    // Light text on dark
  tertiary: '#34d399',     // Lighter green for dark mode
  alternate: '#111827',    // Dark background
  
  // Utility Colors
  primaryText: '#f9fafb',     // Light text
  secondaryText: '#9ca3af',   // Gray 400 - Secondary text
  primaryBackground: '#111827', // Dark background
  secondaryBackground: '#1f2937', // Gray 800 - Darker background
  
  // Accent Colors
  accent1: '#34d399',      // Lighter green for dark mode
  accent2: '#60a5fa',      // Lighter blue
  accent3: '#fbbf24',      // Lighter yellow
  accent4: '#374151',      // Dark gray accent
  
  // Semantic Colors
  success: '#34d399',      // Emerald 400
  warning: '#fbbf24',      // Amber 400
  error: '#f87171',        // Red 400
  info: '#60a5fa',         // Blue 400
  
  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  gray50: '#1f2937',
  gray100: '#374151',
  gray200: '#4b5563',
  gray300: '#6b7280',
  gray400: '#9ca3af',
  gray500: '#d1d5db',
  gray600: '#e5e7eb',
  gray700: '#f3f4f6',
  gray800: '#f9fafb',
  gray900: '#ffffff',
}

// Color utilities
export const getColorValue = (colorName: keyof ColorPalette, isDark = false): string => {
  const palette = isDark ? darkColors : lightColors
  return palette[colorName]
}

// CSS Custom Properties for web
export const generateCSSVariables = (colors: ColorPalette): Record<string, string> => {
  const cssVars: Record<string, string> = {}
  
  Object.entries(colors).forEach(([key, value]) => {
    cssVars[`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
  })
  
  return cssVars
}

// Tailwind color configuration
export const tailwindColors = {
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main brand color
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
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
}

// Export colors object for use in Tailwind config
export const colors = {
  primary: tailwindColors.primary,
  secondary: tailwindColors.secondary,
} 