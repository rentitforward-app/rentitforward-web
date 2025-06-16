# Rent It Forward Design System

A comprehensive design system built for consistency across web and mobile platforms, inspired by FlutterFlow's theme management approach.

## 🎨 Overview

The Rent It Forward Design System provides a unified set of design tokens, components, and utilities that ensure consistency across all platforms. It's built with TypeScript and designed to work seamlessly with both web (React/Next.js) and mobile (React Native/Expo) applications.

## 📁 Structure

```
rentitforward-shared/src/design-system/
├── index.ts              # Main exports
├── colors.ts             # Color palette and utilities
├── typography.ts         # Text styles and font configuration
├── spacing.ts            # Spacing, border radius, and shadows
├── breakpoints.ts        # Responsive breakpoints
├── components.ts         # Component style definitions
├── theme.ts              # Theme management
└── tokens.ts             # Design tokens for platform consumption
```

## 🎯 Key Features

- **🌈 Comprehensive Color System**: Light/dark themes with semantic color naming
- **📝 Typography Scale**: Responsive text styles with proper hierarchy
- **📏 Consistent Spacing**: 8px grid system for perfect alignment
- **📱 Responsive Design**: Breakpoints that work across all devices
- **🧩 Component Variants**: Pre-defined component styles with states
- **🔄 Theme Management**: Easy switching between light and dark modes
- **🚀 Platform Agnostic**: Works with web and mobile applications

## 🚀 Quick Start

### Installation

The design system is part of the shared package:

```bash
npm install @rentitforward/shared
```

### Basic Usage (Web)

```tsx
import { ThemeProvider } from '../components/ThemeProvider'
import { lightTheme, darkTheme } from '@rentitforward/shared'

function App() {
  return (
    <ThemeProvider defaultTheme="light" enableSystemTheme>
      <YourApp />
    </ThemeProvider>
  )
}
```

### Using Theme in Components

```tsx
import { useTheme } from '../components/ThemeProvider'
import { Button } from '../components/ui/Button'

function MyComponent() {
  const { theme, isDark, toggleTheme } = useTheme()
  
  return (
    <div style={{ backgroundColor: theme.colors.primaryBackground }}>
      <Button variant="primary" onClick={toggleTheme}>
        Switch to {isDark ? 'Light' : 'Dark'} Mode
      </Button>
    </div>
  )
}
```

## 🎨 Color System

### Brand Colors
- **Primary**: `#22c55e` - Main brand green
- **Secondary**: `#343c3e` - Dark gray for text/headers
- **Tertiary**: `#136806` - Dark green for accents
- **Alternate**: `#ffffff` - White for backgrounds

### Usage Examples

```tsx
// Using theme colors
const { theme } = useTheme()
<div style={{ color: theme.colors.primary }}>Primary Text</div>

// Using Tailwind classes
<div className="bg-primary-500 text-white">Primary Button</div>

// Using CSS custom properties
<div style={{ backgroundColor: 'var(--color-primary)' }}>Primary Background</div>
```

## 📝 Typography

### Text Styles Hierarchy

- **Display**: Large hero text (64px, 48px, 36px)
- **Headline**: Section headers (32px, 28px, 24px)
- **Title**: Card titles, form labels (20px, 18px, 16px)
- **Body**: Main content (18px, 16px, 14px)
- **Label**: Buttons, tags (16px, 14px, 12px)

### Font Families

- **Sora**: Display and headline text (weights: 300-800)
- **Manrope**: Body text and content (weights: 300-800)
- **Inter**: Alternative sans-serif (weights: 300-700)

### Usage Examples

```tsx
// Using theme typography
const { theme } = useTheme()
<h1 style={theme.typography.displayLarge}>Hero Title</h1>

// Using Tailwind classes
<h1 className="text-display-lg font-sora font-extrabold">Hero Title</h1>

// Using CSS custom properties
<h1 style={{ 
  fontSize: 'var(--text-display-large-size)',
  fontWeight: 'var(--text-display-large-weight)'
}}>Hero Title</h1>
```

## 📏 Spacing System

### 8px Grid System

- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px
- **4xl**: 80px
- **5xl**: 96px
- **6xl**: 128px

### Component-Specific Spacing

```tsx
// Button padding
const buttonPadding = theme.spacing.buttonPadding.md // { x: 16, y: 8 }

// Card padding
const cardPadding = theme.spacing.cardPadding.lg // 32px

// Section padding
const sectionPadding = theme.spacing.sectionPadding.md // 48px
```

## 📱 Responsive Breakpoints

- **Mobile**: 480px
- **Tablet**: 768px
- **Tablet Landscape**: 992px
- **Desktop**: 1200px
- **Wide**: 1440px

### Usage Examples

```tsx
// Using breakpoint utilities
const { isDesktop, isMobile } = useBreakpoint()

// Using Tailwind responsive classes
<div className="text-sm md:text-base lg:text-lg">Responsive Text</div>

// Using media queries
const styles = {
  [theme.breakpoints.mobile]: {
    fontSize: '14px'
  },
  [theme.breakpoints.desktop]: {
    fontSize: '18px'
  }
}
```

## 🧩 Component System

### Button Variants

```tsx
<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="text">Text Button</Button>
```

### Button Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

### Button States

```tsx
<Button loading>Loading Button</Button>
<Button disabled>Disabled Button</Button>
<Button leftIcon={<Icon />}>With Icon</Button>
```

## 🎛️ Theme Management

### Theme Provider Setup

```tsx
<ThemeProvider 
  defaultTheme="light"
  enableSystemTheme={true}
  storageKey="rent-it-forward-theme"
>
  <App />
</ThemeProvider>
```

### Theme Hook

```tsx
const { 
  theme,        // Current theme object
  isDark,       // Boolean for dark mode
  toggleTheme,  // Function to toggle theme
  setTheme      // Function to set specific theme
} = useTheme()
```

### Theme Toggle Component

```tsx
import { ThemeToggle } from '../components/ThemeProvider'

<ThemeToggle className="ml-auto" />
```

## 🔧 Customization

### Custom Colors

```tsx
const customTheme = createTheme({
  defaultTheme: 'light',
  enableSystemTheme: true,
  customColors: {
    primary: '#your-brand-color',
    secondary: '#your-secondary-color'
  }
})
```

### Custom Typography

```tsx
const customTheme = createTheme({
  defaultTheme: 'light',
  customTypography: {
    displayLarge: {
      fontSize: 72,
      fontWeight: 900,
      fontFamily: 'YourCustomFont'
    }
  }
})
```

## 📱 Mobile Usage (React Native)

```tsx
import { mobileTokens } from '@rentitforward/shared'

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileTokens.colors.primaryBackground,
    padding: mobileTokens.spacing.md,
  },
  title: {
    fontSize: mobileTokens.typography.headlineLarge.fontSize,
    fontWeight: mobileTokens.typography.headlineLarge.fontWeight,
    color: mobileTokens.colors.primaryText,
  }
})
```

## 🛠️ Development Tools

### Tailwind Configuration

The design system automatically generates Tailwind configuration:

```js
// tailwind.config.js
import { generateTailwindConfig } from './src/lib/design-system'
import { lightTheme } from '@rentitforward/shared'

export default generateTailwindConfig(lightTheme)
```

### CSS Custom Properties

```tsx
// Automatically inject theme variables
import { injectThemeVariables } from './src/lib/design-system'

useEffect(() => {
  injectThemeVariables(theme)
}, [theme])
```

## 📋 Best Practices

### 1. Use Semantic Color Names
```tsx
// ✅ Good
<div className="bg-primary-500 text-white">

// ❌ Avoid
<div className="bg-green-500 text-white">
```

### 2. Follow Typography Hierarchy
```tsx
// ✅ Good
<h1 className="text-display-lg">Page Title</h1>
<h2 className="text-headline-lg">Section Title</h2>
<p className="text-body-md">Body content</p>

// ❌ Avoid
<h1 className="text-6xl">Page Title</h1>
```

### 3. Use Consistent Spacing
```tsx
// ✅ Good
<div className="p-md mb-lg">

// ❌ Avoid
<div className="p-4 mb-6">
```

### 4. Leverage Component Variants
```tsx
// ✅ Good
<Button variant="primary" size="lg">Submit</Button>

// ❌ Avoid
<button className="bg-green-500 px-6 py-3 text-lg">Submit</button>
```

## 🔍 Troubleshooting

### Common Issues

1. **Theme not applying**: Ensure ThemeProvider wraps your app
2. **Colors not updating**: Check if CSS custom properties are injected
3. **TypeScript errors**: Make sure @rentitforward/shared is properly installed
4. **Mobile styles not working**: Use mobileTokens instead of web tokens

### Debug Mode

```tsx
// Enable debug logging
const { theme } = useTheme()
console.log('Current theme:', theme)
console.log('Design tokens:', designTokens)
```

## 📚 Resources

- [Figma Design File](https://figma.com/your-design-file)
- [Component Storybook](https://storybook.rentitforward.com)
- [Design System Guidelines](https://design.rentitforward.com)

## 🤝 Contributing

When adding new components or tokens:

1. Follow the existing naming conventions
2. Add TypeScript types for all new interfaces
3. Include both light and dark mode variants
4. Test on both web and mobile platforms
5. Update this documentation

---

Built with ❤️ for the Rent It Forward community 