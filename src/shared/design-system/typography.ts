// Typography System - Text Styles and Font Configuration
// Responsive typography system for web and mobile

export interface FontFamily {
  name: string
  weights: number[]
  fallback: string[]
}

export interface TextStyle {
  fontSize: number
  lineHeight: number
  fontWeight: number
  letterSpacing: number
  fontFamily: string
  color?: string
  responsive?: {
    mobile?: Partial<TextStyle>
    tablet?: Partial<TextStyle>
    desktop?: Partial<TextStyle>
  }
}

export interface TypographyScale {
  // Display Styles - Large hero text
  displayLarge: TextStyle
  displayMedium: TextStyle
  displaySmall: TextStyle
  
  // Headline Styles - Section headers
  headlineLarge: TextStyle
  headlineMedium: TextStyle
  headlineSmall: TextStyle
  
  // Title Styles - Card titles, form labels
  titleLarge: TextStyle
  titleMedium: TextStyle
  titleSmall: TextStyle
  
  // Body Styles - Main content
  bodyLarge: TextStyle
  bodyMedium: TextStyle
  bodySmall: TextStyle
  
  // Label Styles - Buttons, tags
  labelLarge: TextStyle
  labelMedium: TextStyle
  labelSmall: TextStyle
}

// Font Families
export const fontFamilies: Record<string, FontFamily> = {
  sora: {
    name: 'Sora',
    weights: [300, 400, 500, 600, 700, 800],
    fallback: ['system-ui', '-apple-system', 'sans-serif']
  },
  manrope: {
    name: 'Manrope',
    weights: [300, 400, 500, 600, 700, 800],
    fallback: ['system-ui', '-apple-system', 'sans-serif']
  },
  inter: {
    name: 'Inter',
    weights: [300, 400, 500, 600, 700],
    fallback: ['system-ui', '-apple-system', 'sans-serif']
  },
  system: {
    name: 'System',
    weights: [400, 500, 600, 700],
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
  }
}

// Typography Scale - Based on FlutterFlow structure
export const typography: TypographyScale = {
  // Display Styles - Hero sections
  displayLarge: {
    fontSize: 64,
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: -0.02,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 48 },
      tablet: { fontSize: 56 },
      desktop: { fontSize: 64 }
    }
  },
  
  displayMedium: {
    fontSize: 48,
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: -0.01,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 36 },
      tablet: { fontSize: 42 },
      desktop: { fontSize: 48 }
    }
  },
  
  displaySmall: {
    fontSize: 36,
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: 0,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 28 },
      tablet: { fontSize: 32 },
      desktop: { fontSize: 36 }
    }
  },
  
  // Headline Styles - Section headers
  headlineLarge: {
    fontSize: 32,
    lineHeight: 1.25,
    fontWeight: 700,
    letterSpacing: 0,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 24 },
      tablet: { fontSize: 28 },
      desktop: { fontSize: 32 }
    }
  },
  
  headlineMedium: {
    fontSize: 28,
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: 0,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 22 },
      tablet: { fontSize: 25 },
      desktop: { fontSize: 28 }
    }
  },
  
  headlineSmall: {
    fontSize: 24,
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: 0,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 20 },
      tablet: { fontSize: 22 },
      desktop: { fontSize: 24 }
    }
  },
  
  // Title Styles - Card titles, form labels
  titleLarge: {
    fontSize: 20,
    lineHeight: 1.4,
    fontWeight: 600,
    letterSpacing: 0,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 18 },
      tablet: { fontSize: 19 },
      desktop: { fontSize: 20 }
    }
  },
  
  titleMedium: {
    fontSize: 18,
    lineHeight: 1.4,
    fontWeight: 600,
    letterSpacing: 0,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 16 },
      tablet: { fontSize: 17 },
      desktop: { fontSize: 18 }
    }
  },
  
  titleSmall: {
    fontSize: 16,
    lineHeight: 1.4,
    fontWeight: 600,
    letterSpacing: 0,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 14 },
      tablet: { fontSize: 15 },
      desktop: { fontSize: 16 }
    }
  },
  
  // Body Styles - Main content
  bodyLarge: {
    fontSize: 18,
    lineHeight: 1.6,
    fontWeight: 400,
    letterSpacing: 0,
    fontFamily: 'Manrope',
    responsive: {
      mobile: { fontSize: 16 },
      tablet: { fontSize: 17 },
      desktop: { fontSize: 18 }
    }
  },
  
  bodyMedium: {
    fontSize: 16,
    lineHeight: 1.6,
    fontWeight: 400,
    letterSpacing: 0,
    fontFamily: 'Manrope',
    responsive: {
      mobile: { fontSize: 14 },
      tablet: { fontSize: 15 },
      desktop: { fontSize: 16 }
    }
  },
  
  bodySmall: {
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 400,
    letterSpacing: 0,
    fontFamily: 'Manrope',
    responsive: {
      mobile: { fontSize: 12 },
      tablet: { fontSize: 13 },
      desktop: { fontSize: 14 }
    }
  },
  
  // Label Styles - Buttons, tags
  labelLarge: {
    fontSize: 16,
    lineHeight: 1.4,
    fontWeight: 600,
    letterSpacing: 0.01,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 14 },
      tablet: { fontSize: 15 },
      desktop: { fontSize: 16 }
    }
  },
  
  labelMedium: {
    fontSize: 14,
    lineHeight: 1.4,
    fontWeight: 600,
    letterSpacing: 0.01,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 12 },
      tablet: { fontSize: 13 },
      desktop: { fontSize: 14 }
    }
  },
  
  labelSmall: {
    fontSize: 12,
    lineHeight: 1.3,
    fontWeight: 600,
    letterSpacing: 0.02,
    fontFamily: 'Sora',
    responsive: {
      mobile: { fontSize: 10 },
      tablet: { fontSize: 11 },
      desktop: { fontSize: 12 }
    }
  }
}

// Utility functions
export const getTextStyle = (styleName: keyof TypographyScale): TextStyle => {
  return typography[styleName]
}

export const getFontFamily = (familyName: keyof typeof fontFamilies): FontFamily => {
  return fontFamilies[familyName]
}

// CSS generation for web
export const generateTextStyleCSS = (style: TextStyle, breakpoint?: 'mobile' | 'tablet' | 'desktop'): string => {
  const responsive = breakpoint && style.responsive?.[breakpoint]
  const finalStyle = { ...style, ...responsive }
  
  return `
    font-size: ${finalStyle.fontSize}px;
    line-height: ${finalStyle.lineHeight};
    font-weight: ${finalStyle.fontWeight};
    letter-spacing: ${finalStyle.letterSpacing}em;
    font-family: ${finalStyle.fontFamily}, ${fontFamilies[finalStyle.fontFamily as keyof typeof fontFamilies]?.fallback.join(', ') || 'sans-serif'};
    ${finalStyle.color ? `color: ${finalStyle.color};` : ''}
  `.trim()
}

// Tailwind typography configuration
export const tailwindTypography = {
  fontFamily: {
    sora: ['Sora', ...fontFamilies.sora.fallback],
    manrope: ['Manrope', ...fontFamilies.manrope.fallback],
    inter: ['Inter', ...fontFamilies.inter.fallback],
    system: fontFamilies.system.fallback,
  },
  fontSize: {
    'display-lg': ['64px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
    'display-md': ['48px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
    'display-sm': ['36px', { lineHeight: '1.2', letterSpacing: '0em' }],
    'headline-lg': ['32px', { lineHeight: '1.25', letterSpacing: '0em' }],
    'headline-md': ['28px', { lineHeight: '1.3', letterSpacing: '0em' }],
    'headline-sm': ['24px', { lineHeight: '1.3', letterSpacing: '0em' }],
    'title-lg': ['20px', { lineHeight: '1.4', letterSpacing: '0em' }],
    'title-md': ['18px', { lineHeight: '1.4', letterSpacing: '0em' }],
    'title-sm': ['16px', { lineHeight: '1.4', letterSpacing: '0em' }],
    'body-lg': ['18px', { lineHeight: '1.6', letterSpacing: '0em' }],
    'body-md': ['16px', { lineHeight: '1.6', letterSpacing: '0em' }],
    'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '0em' }],
    'label-lg': ['16px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
    'label-md': ['14px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
    'label-sm': ['12px', { lineHeight: '1.3', letterSpacing: '0.02em' }],
  }
} 