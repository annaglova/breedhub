import { useState, useEffect, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@ui/lib/utils";

interface ScrollToTopButtonProps {
  /** Scroll container element - if not provided, uses window */
  scrollContainer?: HTMLElement | null;
  /** Threshold as fraction of viewport height (0.33 = 1/3) */
  threshold?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ScrollToTopButton - Floating button to scroll back to top
 *
 * Appears with fade-in animation when user scrolls past threshold.
 * Clicking smoothly scrolls to top.
 *
 * Usage:
 * - For window scroll: <ScrollToTopButton />
 * - For container scroll: <ScrollToTopButton scrollContainer={containerRef.current} />
 */
export function ScrollToTopButton({
  scrollContainer,
  threshold = 0.33,
  className,
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

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
      className={cn(
        // Base styles - positioned at 1/3 from bottom (bottom-[33vh])
        "fixed bottom-[33vh] right-6 z-50",
        "w-12 h-12 rounded-full",
        "bg-primary text-white shadow-lg",
        "flex items-center justify-center",
        // Hover/active states
        "hover:bg-primary/90 hover:shadow-xl",
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
