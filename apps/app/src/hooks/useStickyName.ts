/**
 * useStickyName - Track sticky state and height of a name container.
 *
 * Detects when a sticky element is "stuck" to the top of its scroll container,
 * and tracks its height via ResizeObserver.
 *
 * Used by PublicPageTemplate, EditPageTemplate, and TabPageTemplate.
 */
import { useEffect, useRef, useState } from "react";

interface UseStickyNameOptions {
  deps?: any[];
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  threshold?: number;
}

export function useStickyName({
  deps = [],
  scrollContainerRef,
  threshold = 0,
}: UseStickyNameOptions = {}) {
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const [nameOnTop, setNameOnTop] = useState(false);
  const [nameBlockHeight, setNameBlockHeight] = useState(0);

  // Scroll listener for sticky detection
  useEffect(() => {
    if (!nameContainerRef.current) return;

    let scrollContainer = scrollContainerRef?.current ?? null;

    if (!scrollContainer) {
      scrollContainer = nameContainerRef.current.parentElement;
      while (scrollContainer) {
        const overflowY = window.getComputedStyle(scrollContainer).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          break;
        }
        scrollContainer = scrollContainer.parentElement;
      }
    }

    if (!scrollContainer) return;

    const checkSticky = () => {
      if (!nameContainerRef.current) return;

      const containerTop = scrollContainer!.getBoundingClientRect().top;
      const elementTop = nameContainerRef.current.getBoundingClientRect().top;

      const isStuck = Math.abs(containerTop - elementTop) <= threshold;
      setNameOnTop(isStuck);
    };

    scrollContainer.addEventListener("scroll", checkSticky);
    requestAnimationFrame(checkSticky);

    return () => {
      scrollContainer?.removeEventListener("scroll", checkSticky);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollContainerRef, threshold, ...deps]);

  // ResizeObserver for height tracking
  useEffect(() => {
    if (!nameContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setNameBlockHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(nameContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return { nameContainerRef, nameOnTop, nameBlockHeight };
}
