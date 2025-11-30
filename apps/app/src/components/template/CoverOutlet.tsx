import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Expand } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { NavigationButtons } from './cover/NavigationButtons';
import { spaceStore } from '@breedhub/rxdb-store';
import { normalizeForUrl } from '@/components/space/utils/filter-url-helpers';

interface CoverOutletProps {
  entity: any;
  component: string;
  className?: string;
  // Dimensions calculated from parent container
  coverWidth: number;
  coverHeight: number;
  // Drawer mode flag
  isDrawerMode?: boolean;
  // Default tab fragment for expand (from config, e.g., 'achievements')
  defaultTab?: string;
  // Component to render inside the cover
  children?: React.ReactNode;
}

/**
 * CoverOutlet - Universal cover outlet with dimensions, styling, and navigation
 *
 * Provides:
 * - Container with proper dimensions and styling
 * - Top gradient overlay for better contrast
 * - Universal navigation buttons (Expand, Prev, Next)
 * - Wraps entity-specific cover components (BreedCoverV1, KennelCoverV1, etc.)
 *
 * Note:
 * - Dimensions are calculated by parent (PublicPageTemplate) based on content container
 * - Navigation buttons are universal (not entity-specific)
 *
 * Based on Angular: PublicPageTemplate cover section
 */
export function CoverOutlet({
  entity,
  component,
  className = '',
  coverWidth,
  coverHeight,
  isDrawerMode = false,
  defaultTab,
  children,
}: CoverOutletProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if already in fullscreen mode
  const isFullscreen = spaceStore.isFullscreen.value;

  const handleExpand = () => {
    if (!entity) return;

    // Get slug from entity (use existing slug or normalize name)
    const slug = entity.slug || normalizeForUrl(entity.name || entity.id);

    // Build pretty URL: /{slug}#{defaultTab}
    // Open on default tab from config so user sees the beautiful cover
    // No query params - fullscreen mode is clean URL
    const hash = defaultTab ? `#${defaultTab}` : '';
    const prettyUrl = `/${slug}${hash}`;

    console.log('[CoverOutlet] handleExpand:', { entity, slug, defaultTab, prettyUrl });

    // Navigate to pretty URL (absolute path from root)
    // SlugResolver will set fullscreen in store and render SpacePage
    navigate(prettyUrl);
  };

  // Show expand button only in drawer mode AND not already fullscreen
  const showExpandButton = isDrawerMode && !isFullscreen;

  return (
    <div
      className={`relative flex size-full justify-center overflow-hidden rounded-lg border border-gray-200 px-6 pt-4 shadow-sm sm:pb-3 sm:pt-6 mb-6 ${className}`}
      style={{
        width: `${coverWidth}px`,
        maxWidth: `${coverWidth}px`,
        height: `${coverHeight}px`,
        maxHeight: `${coverHeight}px`,
      }}
    >
      {/* Top gradient overlay */}
      <div className="absolute top-0 z-10 h-28 w-full bg-gradient-to-b from-[#200e4c]/40 to-transparent" />

      {/* Cover component wrapper */}
      <div className="flex w-full max-w-3xl flex-col lg:max-w-4xl xxl:max-w-5xl">
        {/* Navigation buttons */}
        <div className="z-40 flex w-full pb-2">
          {showExpandButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleExpand}
                  className="mr-auto hidden md:block"
                >
                  <Expand size={22} className="text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Full screen view</TooltipContent>
            </Tooltip>
          )}
          <NavigationButtons
            mode="white"
            className="sticky top-0 ml-auto"
          />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 size-full bg-gradient-to-r from-primary-50/10 to-primary-400/85 z-10" />

        {/* Cover content (entity-specific) */}
        {children}
      </div>
    </div>
  );
}
