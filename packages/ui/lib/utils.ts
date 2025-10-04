// packages/ui/lib/utils.ts

import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Icons from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get lucide icon component by kebab-case name
 * Converts "arrow-down-narrow-wide" to "ArrowDownNarrowWide"
 */
export function getIconComponent(iconName?: string): React.ComponentType<{ className?: string }> {
  if (!iconName) return Icons.List; // Default fallback

  // Convert icon name to PascalCase (e.g., "arrow-down-narrow-wide" -> "ArrowDownNarrowWide")
  const pascalCase = iconName
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  // Try to get icon from lucide-react
  const IconComponent = (Icons as any)[pascalCase];

  // Return found icon or default
  return IconComponent || Icons.List;
}
