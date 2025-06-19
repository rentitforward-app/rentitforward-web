// Theme System - Main theme configuration and management
// Centralized theme system similar to FlutterFlow

import { ColorPalette, lightColors, darkColors } from './colors'
import { TypographyScale, typography } from './typography'
import { SpacingScale, spacing } from './spacing'
import { BreakpointConfig, breakpoints } from './breakpoints'
import { ComponentTheme, createComponentTheme } from './components'

export interface Theme {
  name: string
  mode: 'light' | 'dark'
  colors: ColorPalette
  typography: TypographyScale
  spacing: SpacingScale
  breakpoints: BreakpointConfig
  components: ComponentTheme
}

export interface ThemeConfig {
  defaultTheme: 'light' | 'dark'
  enableSystemTheme: boolean
  customColors?: Partial<ColorPalette>
  customTypography?: Partial<TypographyScale>
  customSpacing?: Partial<SpacingScale>
}

// Default theme configurations
export const lightTheme: Theme = {
  name: 'Rent It Forward Light',
  mode: 'light',
  colors: lightColors,
  typography,
  spacing,
  breakpoints,
  components: createComponentTheme(lightColors),
}

export const darkTheme: Theme = {
  name: 'Rent It Forward Dark',
  mode: 'dark',
  colors: darkColors,
  typography,
  spacing,
  breakpoints,
  components: createComponentTheme(darkColors),
}

// Theme utilities
export const getTheme = (mode: 'light' | 'dark' = 'light'): Theme => {
  return mode === 'dark' ? darkTheme : lightTheme
}

export const getCurrentTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme
}

// Theme creation function
export const createTheme = (config: ThemeConfig): { light: Theme; dark: Theme } => {
  const customLightColors = { ...lightColors, ...config.customColors }
  const customDarkColors = { ...darkColors, ...config.customColors }
  const customTypography = { ...typography, ...config.customTypography }
  const customSpacing = { ...spacing, ...config.customSpacing }

  return {
    light: {
      name: 'Custom Light Theme',
      mode: 'light',
      colors: customLightColors,
      typography: customTypography,
      spacing: customSpacing,
      breakpoints,
      components: createComponentTheme(customLightColors),
    },
    dark: {
      name: 'Custom Dark Theme',
      mode: 'dark',
      colors: customDarkColors,
      typography: customTypography,
      spacing: customSpacing,
      breakpoints,
      components: createComponentTheme(customDarkColors),
    }
  }
}

// Theme context interface for React (web)
export interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  setTheme: (mode: 'light' | 'dark') => void
}

// React Hook placeholder for theme (web only)
export const useTheme = (): ThemeContextValue => {
  throw new Error('useTheme hook must be implemented in the web project')
} 