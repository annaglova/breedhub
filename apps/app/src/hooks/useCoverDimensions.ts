import { useLayoutEffect, useEffect, useState, RefObject } from "react";

/**
 * Calculate dimensions based on container width
 * Formula from Angular project (page-header.component.ts)
 */
function calculateDimensions(containerWidth: number) {
  const headerWidth = containerWidth > 0 ? Math.min(containerWidth, 1006) : 400;
  const headerHeight =
    headerWidth > 960
      ? Math.round(0.4 * headerWidth) // Wide screens: 40%
      : Math.round(0.44 * headerWidth); // Narrow screens: 44%

  return { width: headerWidth, height: headerHeight };
}

/**
 * useCoverDimensions - Calculate cover dimensions based on container width
 *
 * Formula from Angular project (page-header.component.ts):
 * - Width: min(container width, 1006px)
 * - Height:
 *   - If width > 960px: 40% of width
 *   - If width <= 960px: 44% of width
 *
 * Uses useLayoutEffect for synchronous calculation before paint,
 * preventing flash of incorrectly sized skeleton.
 *
 * @param containerRef - Reference to the container element to measure
 */
export function useCoverDimensions(containerRef: RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({
    width: 400,
    height: 176, // 44% of 400
  });

  // Use useLayoutEffect for initial calculation to prevent flash
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Calculate immediately on mount
    const newDimensions = calculateDimensions(container.offsetWidth);
    setDimensions(newDimensions);
  }, [containerRef]);

  // Use useEffect for ResizeObserver (async updates are fine)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use ResizeObserver to monitor container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const newDimensions = calculateDimensions(containerWidth);
        setDimensions(newDimensions);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return dimensions;
}
