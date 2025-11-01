import { useEffect, useState, RefObject } from "react";

/**
 * useCoverDimensions - Calculate cover dimensions based on container width
 *
 * Formula from Angular project (page-header.component.ts):
 * - Width: min(container width, 1006px)
 * - Height:
 *   - If width > 960px: 40% of width
 *   - If width <= 960px: 44% of width
 *
 * @param containerRef - Reference to the container element to measure
 */
export function useCoverDimensions(containerRef: RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({
    width: 400,
    height: 176, // 44% of 400
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateDimensions = (containerWidth: number) => {
      const headerWidth = containerWidth > 0 ? Math.min(containerWidth, 1006) : 400;
      const headerHeight =
        headerWidth > 960
          ? Math.round(0.4 * headerWidth) // Wide screens: 40%
          : Math.round(0.44 * headerWidth); // Narrow screens: 44%

      setDimensions({
        width: headerWidth,
        height: headerHeight,
      });
    };

    // Use ResizeObserver to monitor container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        calculateDimensions(containerWidth);
      }
    });

    resizeObserver.observe(container);

    // Initial calculation
    calculateDimensions(container.offsetWidth);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return dimensions;
}
