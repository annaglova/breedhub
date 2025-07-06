# Landing Menu Components

This directory contains two landing menu components for the BreedHub landing pages.

## Components

### 1. LandingMenu (Basic)
A simple, clean navigation menu with:
- Horizontal menu on desktop
- Mobile sidebar that slides in from the right
- Transparent background that becomes solid on scroll
- Basic menu items with active state highlighting

**Usage:**
```tsx
import LandingMenu from '@/components/LandingMenu';

// In your layout
<LandingMenu />
```

### 2. LandingMenuAdvanced
An enhanced navigation menu with additional features:
- Dropdown menus with icons and descriptions
- Multiple style variants (default, transparent, floating)
- Enhanced mobile experience with categorized navigation
- Smooth animations and transitions

**Usage:**
```tsx
import LandingMenuAdvanced from '@/components/LandingMenuAdvanced';

// Default variant
<LandingMenuAdvanced />

// Transparent variant (becomes solid on scroll)
<LandingMenuAdvanced variant="transparent" />

// Floating variant (rounded corners, margin from edges)
<LandingMenuAdvanced variant="floating" />
```

## Features

### Mobile Responsiveness
Both components automatically switch to a mobile sidebar on screens smaller than 1024px (lg breakpoint).

### Scroll Effects
The menus can change appearance when the user scrolls:
- Transparent backgrounds become solid
- Shadows appear for better visibility

### Active State
Menu items automatically highlight when their route is active.

### Accessibility
- Keyboard navigation support
- Focus indicators
- ARIA labels where appropriate
- Click outside to close dropdowns

## Customization

### Adding Menu Items

For the basic menu:
```tsx
const menuItems = [
  { to: '/', label: 'Home' },
  { to: '/product', label: 'Product' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  // Add more items here
];
```

For the advanced menu with dropdowns:
```tsx
const productDropdownItems: MenuItemProps[] = [
  {
    to: '/product',
    label: 'Features',
    description: 'Explore all product features',
    icon: <YourIconComponent />,
  },
  // Add more dropdown items
];
```

### Styling
Both components use Tailwind CSS classes and can be customized through:
- The `className` prop for additional styles
- Modifying the color scheme in the component
- Adjusting breakpoints for responsive behavior

## Integration with Landing Layout

The menu is already integrated into the `LandingLayout` component. To switch between basic and advanced versions:

```tsx
// In LandingLayout.tsx
import LandingMenu from "@/components/LandingMenu";
// OR
import LandingMenuAdvanced from "@/components/LandingMenuAdvanced";

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <LandingMenu /> {/* or <LandingMenuAdvanced variant="transparent" /> */}
      <main className="flex-1 flex flex-col pt-16">{children}</main>
      <Footer />
    </div>
  );
}
```

## Migration from Angular

This React implementation replaces the Angular AppMenuComponent with the following improvements:
- Uses React hooks (useState, useEffect) instead of Angular lifecycle methods
- Leverages React Router for navigation instead of Angular Router
- Implements responsive design with Tailwind CSS utility classes
- Provides better TypeScript support with proper interfaces

The component maintains the same core functionality:
- Horizontal menu on desktop
- Mobile sidebar for small screens
- Dynamic styling based on scroll position
- Active route highlighting