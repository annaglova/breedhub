import React from 'react';
import type { SVGProps } from 'react';
import * as LucideIcons from 'lucide-react';
import * as CustomIcons from '@breedhub/icons';

export type IconSource = 'lucide' | 'custom';

export interface IconConfig {
  name: string;
  source: IconSource;
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'ref'> {
  icon: IconConfig;
  size?: number;
  className?: string;
}

/**
 * Universal Icon component
 *
 * Supports both Lucide and custom icons with explicit source
 *
 * @example
 * // Lucide icon
 * <Icon icon={{ name: "Heart", source: "lucide" }} size={24} />
 *
 * // Custom icon
 * <Icon icon={{ name: "menu/breed", source: "custom" }} size={24} />
 */
export function Icon({ icon, size = 24, className = '', ...props }: IconProps) {
  const { name, source } = icon;

  // Render Lucide icon
  if (source === 'lucide') {
    // Lucide uses PascalCase (e.g., "Heart", "ChevronDown")
    const LucideIcon = (LucideIcons as any)[name];

    if (!LucideIcon) {
      console.warn(`[Icon] Lucide icon not found: ${name}`);
      return (
        <span className={className} style={{ color: 'red', fontSize: size }}>
          ?
        </span>
      );
    }

    return <LucideIcon size={size} className={className} {...props} />;
  }

  // Render custom icon
  if (source === 'custom') {
    // Convert path to export name (e.g., "menu/breed" → "MenuBreedIcon")
    const toExportName = (path: string) =>
      path
        .split(/[-_/]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') + 'Icon';

    const exportName = toExportName(name);
    const CustomIcon = (CustomIcons as any)[exportName];

    if (!CustomIcon) {
      console.warn(`[Icon] Custom icon not found: ${name} (${exportName})`);
      return (
        <span className={className} style={{ color: 'red', fontSize: size }}>
          ?
        </span>
      );
    }

    return <CustomIcon width={size} height={size} className={className} {...props} />;
  }

  console.warn(`[Icon] Unknown icon source: ${source}`);
  return (
    <span className={className} style={{ color: 'red', fontSize: size }}>
      ?
    </span>
  );
}
