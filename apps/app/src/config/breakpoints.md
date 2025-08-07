# Custom Breakpoints Implementation

## Overview
We've implemented custom breakpoints from the Angular project to maintain consistency with the existing design system.

## Breakpoint Values
- **sm**: 600px (was 640px in default Tailwind)
- **md**: 960px (was 768px in default Tailwind)  
- **lg**: 1280px (same as default Tailwind)
- **xl**: 1440px (was 1280px in default Tailwind)
- **xxl**: 1536px (same as default Tailwind)
- **xxxl**: 1920px (was 3xl in default Tailwind)

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
- **Mobile to xl (< 1440px)**: Fullscreen overlay
- **xl (1440px+)**: Side drawer with backdrop, 40rem width
- **xxl (1536px+)**: Transparent background, 45rem width + 1.25rem gap

## Migration Notes
When converting styles from Angular, remember to use these custom breakpoints instead of Tailwind defaults.