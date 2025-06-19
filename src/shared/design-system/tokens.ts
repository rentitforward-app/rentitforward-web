// Design Tokens - Platform-agnostic design values
// Easy consumption for web and mobile platforms

import { lightColors, darkColors } from './colors'
import { typography } from './typography'
import { spacing, borderRadius, shadows } from './spacing'
import { breakpoints } from './breakpoints'

// Design tokens interface
export interface DesignTokens {
  colors: {
    light: typeof lightColors
    dark: typeof darkColors
  }
  typography: typeof typography
  spacing: typeof spacing
  borderRadius: typeof borderRadius
  shadows: typeof shadows
  breakpoints: typeof breakpoints
  animation: {
    duration: {
      fast: number
      normal: number
      slow: number
    }
    easing: {
      easeIn: string
      easeOut: string
      easeInOut: string
    }
  }
  zIndex: {
    dropdown: number
    modal: number
    tooltip: number
    overlay: number
    max: number
  }
}

// Complete design tokens
export const designTokens: DesignTokens = {
  colors: {
    light: lightColors,
    dark: darkColors,
  },
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  animation: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    }
  },
  zIndex: {
    dropdown: 1000,
    modal: 1050,
    tooltip: 1070,
    overlay: 1040,
    max: 9999,
  }
}

// Token utilities
export const getToken = (path: string, mode: 'light' | 'dark' = 'light'): any => {
  const keys = path.split('.')
  let value: any = designTokens
  
  for (const key of keys) {
    if (key === 'colors' && keys.length > 1) {
      value = value[key][mode]
      continue
    }
    value = value[key]
    if (value === undefined) break
  }
  
  return value
}

// CSS Custom Properties generation
export const generateTokenVariables = (mode: 'light' | 'dark' = 'light'): Record<string, string> => {
  const cssVars: Record<string, string> = {}
  
  // Colors
  const colors = mode === 'dark' ? darkColors : lightColors
  Object.entries(colors).forEach(([key, value]) => {
    cssVars[`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
  })
  
  // Typography
  Object.entries(typography).forEach(([key, style]) => {
    const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    cssVars[`--text-${kebabKey}-size`] = `${style.fontSize}px`
    cssVars[`--text-${kebabKey}-height`] = `${style.lineHeight}`
    cssVars[`--text-${kebabKey}-weight`] = `${style.fontWeight}`
    cssVars[`--text-${kebabKey}-spacing`] = `${style.letterSpacing}em`
    cssVars[`--text-${kebabKey}-family`] = style.fontFamily
  })
  
  // Spacing
  Object.entries(spacing).forEach(([key, value]) => {
    if (typeof value === 'number') {
      cssVars[`--spacing-${key}`] = `${value}px`
    } else if (typeof value === 'string') {
      cssVars[`--spacing-${key}`] = value
    }
  })
  
  // Border radius
  Object.entries(borderRadius).forEach(([key, value]) => {
    cssVars[`--radius-${key}`] = value
  })
  
  // Shadows
  Object.entries(shadows).forEach(([key, value]) => {
    cssVars[`--shadow-${key}`] = value
  })
  
  // Animation
  Object.entries(designTokens.animation.duration).forEach(([key, value]) => {
    cssVars[`--duration-${key}`] = `${value}ms`
  })
  
  Object.entries(designTokens.animation.easing).forEach(([key, value]) => {
    cssVars[`--easing-${key}`] = value
  })
  
  // Z-index
  Object.entries(designTokens.zIndex).forEach(([key, value]) => {
    cssVars[`--z-${key}`] = `${value}`
  })
  
  return cssVars
}

// Platform-specific token exports
export const webTokens = {
  css: generateTokenVariables('light'),
  cssDark: generateTokenVariables('dark'),
  tailwind: {
    colors: {
      primary: lightColors.primary,
      secondary: lightColors.secondary,
      success: lightColors.success,
      warning: lightColors.warning,
      error: lightColors.error,
      info: lightColors.info,
    },
    fontFamily: {
      sora: ['Sora', 'system-ui', 'sans-serif'],
      manrope: ['Manrope', 'system-ui', 'sans-serif'],
    },
    spacing: {
      xs: `${spacing.xs}px`,
      sm: `${spacing.sm}px`,
      md: `${spacing.md}px`,
      lg: `${spacing.lg}px`,
      xl: `${spacing.xl}px`,
    },
  }
}

// React Native / Mobile tokens
export const mobileTokens = {
  colors: lightColors,
  colorsDark: darkColors,
  typography: Object.fromEntries(
    Object.entries(typography).map(([key, style]) => [
      key,
      {
        fontSize: style.fontSize,
        lineHeight: style.fontSize * style.lineHeight,
        fontWeight: style.fontWeight.toString() as any,
        letterSpacing: style.letterSpacing,
        fontFamily: style.fontFamily,
      }
    ])
  ),
  spacing: Object.fromEntries(
    Object.entries(spacing).map(([key, value]) => [
      key,
      typeof value === 'number' ? value : 0
    ])
  ),
  borderRadius: Object.fromEntries(
    Object.entries(borderRadius).map(([key, value]) => [
      key,
      parseInt(value.replace('px', ''))
    ])
  ),
}

// Export individual token categories for easier imports
export { lightColors, darkColors } from './colors'
export { typography } from './typography'
export { spacing, borderRadius, shadows } from './spacing'
export { breakpoints } from './breakpoints' 