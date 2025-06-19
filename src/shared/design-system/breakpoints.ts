// Breakpoint System - Responsive design breakpoints
// Consistent breakpoints for web and mobile platforms

export interface BreakpointConfig {
  mobile: number
  tablet: number
  tabletLandscape: number
  desktop: number
  wide: number
}

export interface MediaQueries {
  mobile: string
  tablet: string
  tabletLandscape: string
  desktop: string
  wide: string
  
  // Utility queries
  mobileOnly: string
  tabletOnly: string
  desktopUp: string
  tabletUp: string
}

// Breakpoint values (in pixels)
export const breakpoints: BreakpointConfig = {
  mobile: 480,           // Mobile devices
  tablet: 768,           // Tablets portrait
  tabletLandscape: 992,  // Tablets landscape
  desktop: 1200,         // Desktop
  wide: 1440,           // Wide screens
}

// Media queries for CSS
export const mediaQueries: MediaQueries = {
  mobile: `(max-width: ${breakpoints.mobile - 1}px)`,
  tablet: `(min-width: ${breakpoints.mobile}px) and (max-width: ${breakpoints.tablet - 1}px)`,
  tabletLandscape: `(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.tabletLandscape - 1}px)`,
  desktop: `(min-width: ${breakpoints.tabletLandscape}px) and (max-width: ${breakpoints.desktop - 1}px)`,
  wide: `(min-width: ${breakpoints.desktop}px)`,
  
  // Utility queries
  mobileOnly: `(max-width: ${breakpoints.tablet - 1}px)`,
  tabletOnly: `(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.tabletLandscape - 1}px)`,
  desktopUp: `(min-width: ${breakpoints.tabletLandscape}px)`,
  tabletUp: `(min-width: ${breakpoints.tablet}px)`,
}

// Utility functions
export const getBreakpoint = (name: keyof BreakpointConfig): number => {
  return breakpoints[name]
}

export const getMediaQuery = (name: keyof MediaQueries): string => {
  return mediaQueries[name]
}

// Check if current screen size matches breakpoint (for client-side)
export const isBreakpoint = (breakpointName: keyof BreakpointConfig, currentWidth: number): boolean => {
  const breakpointValue = breakpoints[breakpointName]
  
  switch (breakpointName) {
    case 'mobile':
      return currentWidth < breakpoints.tablet
    case 'tablet':
      return currentWidth >= breakpoints.mobile && currentWidth < breakpoints.tabletLandscape
    case 'tabletLandscape':
      return currentWidth >= breakpoints.tablet && currentWidth < breakpoints.desktop
    case 'desktop':
      return currentWidth >= breakpoints.tabletLandscape && currentWidth < breakpoints.wide
    case 'wide':
      return currentWidth >= breakpoints.desktop
    default:
      return false
  }
}

// Get current breakpoint name based on width
export const getCurrentBreakpoint = (width: number): keyof BreakpointConfig => {
  if (width < breakpoints.tablet) return 'mobile'
  if (width < breakpoints.tabletLandscape) return 'tablet'
  if (width < breakpoints.desktop) return 'tabletLandscape'
  if (width < breakpoints.wide) return 'desktop'
  return 'wide'
}

// CSS Custom Properties for web
export const generateBreakpointVariables = (): Record<string, string> => {
  const cssVars: Record<string, string> = {}
  
  Object.entries(breakpoints).forEach(([key, value]) => {
    cssVars[`--breakpoint-${key}`] = `${value}px`
  })
  
  return cssVars
}

// Tailwind breakpoint configuration
export const tailwindBreakpoints = {
  'sm': `${breakpoints.mobile}px`,
  'md': `${breakpoints.tablet}px`,
  'lg': `${breakpoints.tabletLandscape}px`,
  'xl': `${breakpoints.desktop}px`,
  '2xl': `${breakpoints.wide}px`,
}

// Container max-widths for different breakpoints
export const containerSizes = {
  mobile: '100%',
  tablet: '720px',
  tabletLandscape: '960px',
  desktop: '1140px',
  wide: '1320px',
}

// Grid system configuration
export const gridConfig = {
  columns: 12,
  gutter: {
    mobile: 16,
    tablet: 24,
    desktop: 32,
  },
  margins: {
    mobile: 16,
    tablet: 32,
    desktop: 48,
  }
} 