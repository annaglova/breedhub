import React, { useMemo, lazy, Suspense } from 'react';
import type { SVGProps } from 'react';
import * as CustomIcons from '@shared/icons';
import type { IconConfig } from '@breedhub/rxdb-store';

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

  // Fallback SVG component
  const FallbackIcon = () => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="red"
      strokeWidth={2}
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <text x="12" y="16" textAnchor="middle" fill="red" fontSize="14" fontWeight="bold">
        ?
      </text>
    </svg>
  );

  // Render Lucide icon
  if (source === 'lucide') {
    // Dynamically import the specific icon to avoid conflicts with native DOM constructors
    // This way we don't import all icons at once (which would include Image that conflicts with DOM)
    const LucideIcon = useMemo(() => {
      return lazy(() =>
        import('lucide-react')
          .then((mod) => {
            const IconComponent = (mod as any)[name];
            if (!IconComponent) {
              console.warn(`[Icon] Lucide icon not found: ${name}`);
              return { default: FallbackIcon };
            }
            return { default: IconComponent };
          })
          .catch((error) => {
            console.error(`[Icon] Failed to load Lucide icon: ${name}`, error);
            return { default: FallbackIcon };
          })
      );
    }, [name]);

    return (
      <Suspense fallback={<FallbackIcon />}>
        <LucideIcon size={size} className={className} {...props} />
      </Suspense>
    );
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
      console.warn(`[Icon] Custom icon not found: ${name} (trying: ${exportName})`);
      return <FallbackIcon />;
    }
    // Custom SVGs use fill, so we need to set fill style explicitly
    return (
      <CustomIcon
        width={size}
        height={size}
        className={className}
        style={{ fill: 'currentColor' }}
        {...props}
      />
    );
  }

  console.warn(`[Icon] Unknown icon source: ${source}`);
  return <FallbackIcon />;
}
