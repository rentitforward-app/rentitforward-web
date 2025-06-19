// Spacing System - Consistent spacing values for margins, padding, and gaps
// Based on 8px grid system for consistency across platforms

export interface SpacingScale {
  // Base spacing units (8px grid)
  xs: number    // 4px
  sm: number    // 8px
  md: number    // 16px
  lg: number    // 24px
  xl: number    // 32px
  '2xl': number // 48px
  '3xl': number // 64px
  '4xl': number // 80px
  '5xl': number // 96px
  '6xl': number // 128px
  
  // Semantic spacing
  none: number
  auto: string
  
  // Component specific spacing
  buttonPadding: {
    sm: { x: number; y: number }
    md: { x: number; y: number }
    lg: { x: number; y: number }
  }
  
  cardPadding: {
    sm: number
    md: number
    lg: number
  }
  
  sectionPadding: {
    sm: number
    md: number
    lg: number
  }
}

// Spacing values based on 8px grid
export const spacing: SpacingScale = {
  // Base spacing units
  xs: 4,     // 0.25rem
  sm: 8,     // 0.5rem
  md: 16,    // 1rem
  lg: 24,    // 1.5rem
  xl: 32,    // 2rem
  '2xl': 48, // 3rem
  '3xl': 64, // 4rem
  '4xl': 80, // 5rem
  '5xl': 96, // 6rem
  '6xl': 128, // 8rem
  
  // Semantic spacing
  none: 0,
  auto: 'auto',
  
  // Component specific spacing
  buttonPadding: {
    sm: { x: 12, y: 6 },   // Small button
    md: { x: 16, y: 8 },   // Medium button
    lg: { x: 24, y: 12 }   // Large button
  },
  
  cardPadding: {
    sm: 16,  // Small card padding
    md: 24,  // Medium card padding
    lg: 32   // Large card padding
  },
  
  sectionPadding: {
    sm: 32,  // Small section padding
    md: 48,  // Medium section padding
    lg: 64   // Large section padding
  }
}

// Utility functions
export const getSpacing = (size: keyof Omit<SpacingScale, 'buttonPadding' | 'cardPadding' | 'sectionPadding'>): number | string => {
  return spacing[size]
}

export const getButtonPadding = (size: 'sm' | 'md' | 'lg') => {
  return spacing.buttonPadding[size]
}

export const getCardPadding = (size: 'sm' | 'md' | 'lg'): number => {
  return spacing.cardPadding[size]
}

export const getSectionPadding = (size: 'sm' | 'md' | 'lg'): number => {
  return spacing.sectionPadding[size]
}

// CSS Custom Properties for web
export const generateSpacingVariables = (): Record<string, string> => {
  const cssVars: Record<string, string> = {}
  
  // Base spacing
  Object.entries(spacing).forEach(([key, value]) => {
    if (typeof value === 'number') {
      cssVars[`--spacing-${key}`] = `${value}px`
    } else if (typeof value === 'string') {
      cssVars[`--spacing-${key}`] = value
    }
  })
  
  // Button padding
  Object.entries(spacing.buttonPadding).forEach(([size, padding]) => {
    cssVars[`--button-padding-x-${size}`] = `${padding.x}px`
    cssVars[`--button-padding-y-${size}`] = `${padding.y}px`
  })
  
  // Card padding
  Object.entries(spacing.cardPadding).forEach(([size, padding]) => {
    cssVars[`--card-padding-${size}`] = `${padding}px`
  })
  
  // Section padding
  Object.entries(spacing.sectionPadding).forEach(([size, padding]) => {
    cssVars[`--section-padding-${size}`] = `${padding}px`
  })
  
  return cssVars
}

// Tailwind spacing configuration
export const tailwindSpacing = {
  'xs': '4px',
  'sm': '8px',
  'md': '16px',
  'lg': '24px',
  'xl': '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '80px',
  '5xl': '96px',
  '6xl': '128px',
  
  // Additional Tailwind spacing
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '3.5': '14px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '11': '44px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
  '28': '112px',
  '32': '128px',
  '36': '144px',
  '40': '160px',
  '44': '176px',
  '48': '192px',
  '52': '208px',
  '56': '224px',
  '60': '240px',
  '64': '256px',
  '72': '288px',
  '80': '320px',
  '96': '384px',
}

// Border radius values
export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
}

// Shadow values
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} 