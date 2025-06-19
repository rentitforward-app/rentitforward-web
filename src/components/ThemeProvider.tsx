'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
// import { lightTheme, darkTheme, type Theme, type ThemeContextValue } from '../lib/design-system'

// Temporary theme definitions for deployment
const lightTheme = {
  colors: {
    primary: '#22c55e',
    background: '#ffffff',
    text: '#000000'
  }
}

const darkTheme = {
  colors: {
    primary: '#22c55e', 
    background: '#000000',
    text: '#ffffff'
  }
}

type Theme = typeof lightTheme
type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
}

// Theme Context
const ThemeContext = createContext<ThemeContextValue | null>(null)

// Theme Provider Props
interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: 'light' | 'dark'
  enableSystemTheme?: boolean
  storageKey?: string
}

// Theme Provider Component
export function ThemeProvider({ 
  children, 
  defaultTheme = 'light',
  enableSystemTheme = true,
  storageKey = 'rent-it-forward-theme'
}: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const initializeTheme = () => {
      let initialTheme = defaultTheme

      // Check localStorage first
      const storedTheme = localStorage.getItem(storageKey)
      if (storedTheme === 'light' || storedTheme === 'dark') {
        initialTheme = storedTheme
      } else if (enableSystemTheme) {
        // Fall back to system preference
        initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }

      setIsDark(initialTheme === 'dark')
      setIsInitialized(true)

      // Apply theme to document
      applyThemeToDocument(initialTheme === 'dark')
    }

    initializeTheme()
  }, [defaultTheme, enableSystemTheme, storageKey])

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystemTheme) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no manual theme is stored
      const storedTheme = localStorage.getItem(storageKey)
      if (!storedTheme) {
        setIsDark(e.matches)
        applyThemeToDocument(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [enableSystemTheme, storageKey])

  // Apply theme to document
  const applyThemeToDocument = (dark: boolean) => {
    const root = document.documentElement
    
    if (dark) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }

    // Apply CSS custom properties
    const theme = dark ? darkTheme : lightTheme
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      root.style.setProperty(cssVar, String(value))
    })
  }

  // Toggle theme
  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    localStorage.setItem(storageKey, newIsDark ? 'dark' : 'light')
    applyThemeToDocument(newIsDark)
  }

  // Set specific theme
  const setTheme = (mode: 'light' | 'dark') => {
    setIsDark(mode === 'dark')
    localStorage.setItem(storageKey, mode)
    applyThemeToDocument(mode === 'dark')
  }

  // Get current theme
  const theme = isDark ? darkTheme : lightTheme

  const contextValue: ThemeContextValue = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  }

  // Don't render until theme is initialized to prevent flash
  if (!isInitialized) {
    return null
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook to use theme
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme toggle button component
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  )
} 