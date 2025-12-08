import { cn } from "@ui/lib/utils";
import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ScrollToTopButtonProps {
  /** Scroll container element - if not provided, uses window */
  scrollContainer?: HTMLElement | null;
  /** Content container element - used to calculate right position on large screens */
  contentContainer?: HTMLElement | null;
  /** Threshold as fraction of viewport height (0.33 = 1/3) */
  threshold?: number;
  /** Position mode: 'fixed' for fullscreen pages, 'absolute' for embedded containers */
  positioning?: 'fixed' | 'absolute';
  /** Additional CSS classes */
  className?: string;
}

/**
 * ScrollToTopButton - Floating button to scroll back to top
 *
 * Appears with fade-in animation when user scrolls past threshold.
 * Clicking smoothly scrolls to top.
 * On large screens (>=960px), positions relative to content container edge.
 *
 * Usage:
 * - For window scroll: <ScrollToTopButton />
 * - For container scroll: <ScrollToTopButton scrollContainer={containerRef.current} />
 * - With content alignment: <ScrollToTopButton contentContainer={contentRef.current} />
 */
export function ScrollToTopButton({
  scrollContainer,
  contentContainer,
  threshold = 0.33,
  positioning = 'fixed',
  className,
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [rightPosition, setRightPosition] = useState(24); // default right-6 = 24px

  // Check scroll position and update visibility
  const checkScrollPosition = useCallback(() => {
    const scrollElement = scrollContainer || document.documentElement;
    const scrollTop = scrollContainer
      ? scrollContainer.scrollTop
      : window.scrollY;

    // Calculate threshold in pixels (1/3 of viewport height)
    const viewportHeight = window.innerHeight;
    const thresholdPx = viewportHeight * threshold;

    setIsVisible(scrollTop > thresholdPx);
  }, [scrollContainer, threshold]);

  // Subscribe to scroll events
  useEffect(() => {
    const target = scrollContainer || window;

    // Check initial position
    checkScrollPosition();

    // Listen for scroll
    target.addEventListener("scroll", checkScrollPosition, { passive: true });

    return () => {
      target.removeEventListener("scroll", checkScrollPosition);
    };
  }, [scrollContainer, checkScrollPosition]);

  // Calculate right position based on content container
  // On screens >= 960px, align to content edge; otherwise use default 24px
  const calculateRightPosition = useCallback(() => {
    const isLargeScreen = window.innerWidth >= 960;

    if (!isLargeScreen || !contentContainer) {
      setRightPosition(24); // right-6
      return;
    }

    const contentRect = contentContainer.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    // Position button 24px from the right edge of content
    const rightFromContentEdge = windowWidth - contentRect.right + 24;
    setRightPosition(Math.max(24, rightFromContentEdge));
  }, [contentContainer]);

  // Recalculate position on resize and when contentContainer changes
  useEffect(() => {
    calculateRightPosition();

    window.addEventListener("resize", calculateRightPosition);
    return () => {
      window.removeEventListener("resize", calculateRightPosition);
    };
  }, [calculateRightPosition]);

  // Scroll to top handler
  const scrollToTop = () => {
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      style={positioning === 'fixed' ? { right: `${rightPosition}px` } : undefined}
      className={cn(
        // Base styles
        "w-12 h-12 rounded-full z-50",
        // Position mode - same relative bottom offset for consistency
        positioning === 'fixed'
          ? "fixed bottom-[10vh]"
          : "absolute bottom-[10%] right-6",
        // Subtle style matching TabHeader - translucent with blur
        "bg-header-ground/75 backdrop-blur-sm",
        "text-secondary border border-secondary-200",
        "shadow-sm",
        "flex items-center justify-center",
        // Hover/active states
        "hover:bg-header-ground/90 hover:border-secondary-300",
        "active:scale-95",
        // Transition for visibility and interactions
        "transition-all duration-300 ease-in-out",
        // Visibility animation
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
