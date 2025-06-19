// Component System - Reusable component styles and variants
// Similar to FlutterFlow's theme widgets

import { ColorPalette } from './colors'
import { TextStyle } from './typography'
import { SpacingScale } from './spacing'

export interface ComponentVariant {
  default: ComponentStyle
  hover?: ComponentStyle
  active?: ComponentStyle
  disabled?: ComponentStyle
  focus?: ComponentStyle
}

export interface ComponentStyle {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  padding?: {
    x: number
    y: number
  }
  textStyle?: Partial<TextStyle>
  shadow?: string
  opacity?: number
}

export interface ButtonVariants {
  primary: ComponentVariant
  secondary: ComponentVariant
  text: ComponentVariant
  outline: ComponentVariant
}

export interface CardVariants {
  default: ComponentVariant
  elevated: ComponentVariant
  outlined: ComponentVariant
}

export interface InputVariants {
  default: ComponentVariant
  filled: ComponentVariant
  outlined: ComponentVariant
}

export interface ComponentTheme {
  buttons: ButtonVariants
  cards: CardVariants
  inputs: InputVariants
  loadingIndicator: {
    color: string
    size: number
    strokeWidth?: number
  }
}

// Button component styles
export const createButtonStyles = (colors: ColorPalette): ButtonVariants => ({
  primary: {
    default: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: 8,
      padding: { x: 24, y: 12 },
      textStyle: {
        color: colors.white,
        fontWeight: 600,
        fontSize: 16,
      },
      shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    hover: {
      backgroundColor: colors.accent1,
      borderColor: colors.accent1,
      shadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
    active: {
      backgroundColor: colors.tertiary,
      borderColor: colors.tertiary,
    },
    disabled: {
      backgroundColor: colors.gray300,
      borderColor: colors.gray300,
      opacity: 0.6,
    },
    focus: {
      borderColor: colors.primary,
      shadow: `0 0 0 3px ${colors.primary}33`,
    }
  },
  
  secondary: {
    default: {
      backgroundColor: colors.gray100,
      borderColor: colors.gray300,
      borderWidth: 1,
      borderRadius: 8,
      padding: { x: 24, y: 12 },
      textStyle: {
        color: colors.primaryText,
        fontWeight: 600,
        fontSize: 16,
      },
      shadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    hover: {
      backgroundColor: colors.gray200,
      borderColor: colors.gray400,
    },
    active: {
      backgroundColor: colors.gray300,
    },
    disabled: {
      backgroundColor: colors.gray100,
      opacity: 0.6,
    }
  },
  
  text: {
    default: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 8,
      padding: { x: 16, y: 8 },
      textStyle: {
        color: colors.primary,
        fontWeight: 600,
        fontSize: 16,
      },
    },
    hover: {
      backgroundColor: `${colors.primary}10`,
    },
    active: {
      backgroundColor: `${colors.primary}20`,
    },
    disabled: {
      opacity: 0.6,
    }
  },
  
  outline: {
    default: {
      backgroundColor: 'transparent',
      borderColor: colors.primary,
      borderWidth: 2,
      borderRadius: 8,
      padding: { x: 22, y: 10 }, // Slightly less padding to account for border
      textStyle: {
        color: colors.primary,
        fontWeight: 600,
        fontSize: 16,
      },
    },
    hover: {
      backgroundColor: `${colors.primary}10`,
      borderColor: colors.accent1,
      textStyle: {
        color: colors.accent1,
      }
    },
    active: {
      backgroundColor: `${colors.primary}20`,
    },
    disabled: {
      borderColor: colors.gray300,
      textStyle: {
        color: colors.gray400,
      },
      opacity: 0.6,
    }
  }
})

// Card component styles
export const createCardStyles = (colors: ColorPalette): CardVariants => ({
  default: {
    default: {
      backgroundColor: colors.white,
      borderColor: colors.gray200,
      borderWidth: 1,
      borderRadius: 12,
      padding: { x: 24, y: 24 },
      shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    hover: {
      shadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      borderColor: colors.gray300,
    }
  },
  
  elevated: {
    default: {
      backgroundColor: colors.white,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 16,
      padding: { x: 24, y: 24 },
      shadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    hover: {
      shadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    }
  },
  
  outlined: {
    default: {
      backgroundColor: colors.white,
      borderColor: colors.gray300,
      borderWidth: 2,
      borderRadius: 12,
      padding: { x: 22, y: 22 },
      shadow: 'none',
    },
    hover: {
      borderColor: colors.primary,
      shadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    }
  }
})

// Input component styles
export const createInputStyles = (colors: ColorPalette): InputVariants => ({
  default: {
    default: {
      backgroundColor: colors.white,
      borderColor: colors.gray300,
      borderWidth: 1,
      borderRadius: 8,
      padding: { x: 16, y: 12 },
      textStyle: {
        color: colors.primaryText,
        fontSize: 16,
        fontWeight: 400,
      },
    },
    focus: {
      borderColor: colors.primary,
      shadow: `0 0 0 3px ${colors.primary}20`,
    },
    disabled: {
      backgroundColor: colors.gray100,
      borderColor: colors.gray200,
      opacity: 0.6,
    }
  },
  
  filled: {
    default: {
      backgroundColor: colors.gray100,
      borderColor: 'transparent',
      borderWidth: 1,
      borderRadius: 8,
      padding: { x: 16, y: 12 },
      textStyle: {
        color: colors.primaryText,
        fontSize: 16,
        fontWeight: 400,
      },
    },
    focus: {
      backgroundColor: colors.white,
      borderColor: colors.primary,
      shadow: `0 0 0 3px ${colors.primary}20`,
    },
    disabled: {
      backgroundColor: colors.gray200,
      opacity: 0.6,
    }
  },
  
  outlined: {
    default: {
      backgroundColor: 'transparent',
      borderColor: colors.gray400,
      borderWidth: 2,
      borderRadius: 8,
      padding: { x: 14, y: 10 },
      textStyle: {
        color: colors.primaryText,
        fontSize: 16,
        fontWeight: 400,
      },
    },
    focus: {
      borderColor: colors.primary,
      shadow: `0 0 0 3px ${colors.primary}20`,
    },
    disabled: {
      borderColor: colors.gray300,
      opacity: 0.6,
    }
  }
})

// Create complete component theme
export const createComponentTheme = (colors: ColorPalette): ComponentTheme => ({
  buttons: createButtonStyles(colors),
  cards: createCardStyles(colors),
  inputs: createInputStyles(colors),
  loadingIndicator: {
    color: colors.primary,
    size: 24,
    strokeWidth: 3,
  }
})

// Utility functions
export const getComponentStyle = (
  component: ComponentVariant,
  state: keyof ComponentVariant = 'default'
): ComponentStyle => {
  return component[state] || component.default
}

// CSS generation for web components
export const generateComponentCSS = (style: ComponentStyle): string => {
  const css: string[] = []
  
  if (style.backgroundColor) css.push(`background-color: ${style.backgroundColor}`)
  if (style.borderColor) css.push(`border-color: ${style.borderColor}`)
  if (style.borderWidth !== undefined) css.push(`border-width: ${style.borderWidth}px`)
  if (style.borderRadius !== undefined) css.push(`border-radius: ${style.borderRadius}px`)
  if (style.shadow) css.push(`box-shadow: ${style.shadow}`)
  if (style.opacity !== undefined) css.push(`opacity: ${style.opacity}`)
  
  if (style.padding) {
    css.push(`padding: ${style.padding.y}px ${style.padding.x}px`)
  }
  
  if (style.textStyle) {
    if (style.textStyle.color) css.push(`color: ${style.textStyle.color}`)
    if (style.textStyle.fontSize) css.push(`font-size: ${style.textStyle.fontSize}px`)
    if (style.textStyle.fontWeight) css.push(`font-weight: ${style.textStyle.fontWeight}`)
    if (style.textStyle.fontFamily) css.push(`font-family: ${style.textStyle.fontFamily}`)
  }
  
  return css.join('; ')
} 