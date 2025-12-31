# Custom Breakpoints Implementation

## Overview
We've implemented custom breakpoints from the Angular project to maintain consistency with the existing design system.

## Breakpoint Values
- **sm**: 640px (native Tailwind)
- **md**: 768px (native Tailwind)
- **lg**: 1280px (custom, native is 1024px)
- **xl**: 1440px (custom, native is 1280px)
- **2xl**: 1536px (native Tailwind)
- **3xl**: 1920px (custom for ultra-wide screens)

## Key Changes

### 1. Created breakpoints.ts
- Centralized breakpoint configuration
- Export media queries for use with useMediaQuery hook

### 2. Updated tailwind.config.js
- Replaced default Tailwind breakpoints with custom values
- Ensures CSS classes use correct breakpoint values

### 3. Updated SpaceComponent.tsx
- Using custom media queries from breakpoints.ts
- Drawer modes now trigger at correct screen sizes:
  - **< 1440px**: Fullscreen overlay mode
  - **1440px - 1535px**: Side drawer with backdrop
  - **≥ 1536px**: Side-transparent mode with gap

### 4. Updated app-theme.css
- Media queries now use custom breakpoint values
- Drawer margins apply at correct screen sizes

## Drawer Behavior
- **Mobile to md (< 768px)**: Fullscreen overlay
- **md (768px+)**: Side drawer with backdrop, 40rem width
- **2xl (1536px+)**: Transparent background, 45rem width + 1.25rem gap

## Migration Notes
When converting styles from Angular, remember to use these custom breakpoints instead of Tailwind defaults.