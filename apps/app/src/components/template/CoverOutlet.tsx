import { normalizeForUrl } from "@/components/space/utils/filter-url-helpers";
import { spaceStore } from "@breedhub/rxdb-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { Expand } from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavigationButtons } from "./cover/NavigationButtons";

/**
 * Calculate cover dimensions based on container width
 * Formula from Angular project (page-header.component.ts)
 */
function calculateCoverDimensions(containerWidth: number) {
  const headerWidth = containerWidth > 0 ? Math.min(containerWidth, 1006) : 400;
  const headerHeight =
    headerWidth > 960
      ? Math.round(0.4 * headerWidth) // Wide screens: 40%
      : Math.round(0.44 * headerWidth); // Narrow screens: 44%
  return { width: headerWidth, height: headerHeight };
}

interface CoverOutletProps {
  entity: any;
  component: string;
  className?: string;
  // Drawer mode flag
  isDrawerMode?: boolean;
  // Default tab fragment for expand (from config, e.g., 'achievements')
  defaultTab?: string;
  // Loading state - shows skeleton when true
  isLoading?: boolean;
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
  className = "",
  isDrawerMode = false,
  defaultTab,
  isLoading = false,
  children,
}: CoverOutletProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate dimensions based on parent container width
  // Initialize with estimate based on a typical drawer width (~555px for side-transparent)
  const [dimensions, setDimensions] = useState(() => {
    // Initial estimate - will be corrected after mount
    return calculateCoverDimensions(500);
  });

  // Use useLayoutEffect to calculate BEFORE paint
  useLayoutEffect(() => {
    const updateDimensions = () => {
      // Try to get parent width from ref
      let parentWidth = containerRef.current?.parentElement?.offsetWidth || 0;

      // If ref not available yet, try to find content container by class
      if (parentWidth === 0) {
        const contentContainer = document.querySelector(
          ".max-w-3xl.lg\\:max-w-4xl"
        );
        if (contentContainer) {
          parentWidth = contentContainer.clientWidth;
        }
      }

      console.log(
        "[CoverOutlet] parentWidth:",
        parentWidth,
        "isLoading:",
        isLoading
      );

      if (parentWidth > 0) {
        const dims = calculateCoverDimensions(parentWidth);
        console.log("[CoverOutlet] calculated dimensions:", dims);
        setDimensions(dims);
      }
    };

    updateDimensions();
  }, [isLoading]);

  // ResizeObserver for responsive updates
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const parentWidth = entry.contentRect.width;
        if (parentWidth > 0) {
          setDimensions(calculateCoverDimensions(parentWidth));
        }
      }
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, []);

  const { width: coverWidth, height: coverHeight } = dimensions;

  // Check if already in fullscreen mode
  const isFullscreen = spaceStore.isFullscreen.value;

  // Common style for both skeleton and real cover
  const coverStyle = {
    width: `${coverWidth}px`,
    maxWidth: `${coverWidth}px`,
    height: `${coverHeight}px`,
    maxHeight: `${coverHeight}px`,
  };

  console.log(
    "[CoverOutlet] RENDER isLoading:",
    isLoading,
    "dimensions:",
    coverWidth,
    "x",
    coverHeight
  );

  // Show skeleton when loading
  if (isLoading) {
    console.log("[CoverOutlet] Rendering SKELETON with:", coverStyle);
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-lg mb-6 ${className}`}
        style={coverStyle}
      >
        {/* Background skeleton */}
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />

        {/* Top gradient overlay (same as real cover) */}
        <div className="absolute top-0 z-10 h-28 w-full bg-gradient-to-b from-gray-300/40 to-transparent dark:from-gray-600/40" />

        {/* Navigation buttons placeholder */}
        <div className="absolute top-4 right-6 z-40 flex gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-300/50 dark:bg-gray-600/50" />
          <div className="w-8 h-8 rounded-full bg-gray-300/50 dark:bg-gray-600/50" />
        </div>
      </div>
    );
  }

  const handleExpand = () => {
    if (!entity) return;

    // Get slug from entity (use existing slug or normalize name)
    const slug = entity.slug || normalizeForUrl(entity.name || entity.id);

    // Build pretty URL: /{slug}#{defaultTab}
    // Open on default tab from config so user sees the beautiful cover
    // No query params - fullscreen mode is clean URL
    const hash = defaultTab ? `#${defaultTab}` : "";
    const prettyUrl = `/${slug}${hash}`;

    console.log("[CoverOutlet] handleExpand:", {
      entity,
      slug,
      defaultTab,
      prettyUrl,
    });

    // Navigate to pretty URL (absolute path from root)
    // SlugResolver will set fullscreen in store and render SpacePage
    navigate(prettyUrl);
  };

  // Show expand button only in drawer mode AND not already fullscreen
  const showExpandButton = isDrawerMode && !isFullscreen;

  return (
    <div
      ref={containerRef}
      className={`relative flex size-full justify-center overflow-hidden rounded-lg border border-gray-200 px-6 pt-4 shadow-sm sm:pb-3 sm:pt-6 mb-6 ${className}`}
      style={coverStyle}
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
          <NavigationButtons mode="white" className="sticky top-0 ml-auto" />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 size-full bg-gradient-to-r from-primary-50/10 to-primary-400/85 z-10" />

        {/* Cover content (entity-specific) */}
        {children}
      </div>
    </div>
  );
}
