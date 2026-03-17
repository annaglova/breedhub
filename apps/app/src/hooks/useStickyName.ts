/**
 * useStickyName - Track sticky state and height of a name container.
 *
 * Detects when a sticky element is "stuck" to the top of its scroll container,
 * and tracks its height via ResizeObserver.
 *
 * Used by PublicPageTemplate and EditPageTemplate.
 */
import { useEffect, useRef, useState } from "react";

export function useStickyName(deps: any[] = []) {
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const [nameOnTop, setNameOnTop] = useState(false);
  const [nameBlockHeight, setNameBlockHeight] = useState(0);

  // Scroll listener for sticky detection
  useEffect(() => {
    if (!nameContainerRef.current) return;

    let scrollContainer: HTMLElement | null =
      nameContainerRef.current.parentElement;
    while (scrollContainer) {
      const overflowY = window.getComputedStyle(scrollContainer).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }

    if (!scrollContainer) return;

    const checkSticky = () => {
      if (!nameContainerRef.current) return;

      const containerTop = scrollContainer!.getBoundingClientRect().top;
      const elementTop = nameContainerRef.current.getBoundingClientRect().top;

      const isStuck = Math.abs(containerTop - elementTop) === 0;
      setNameOnTop(isStuck);
    };

    scrollContainer.addEventListener("scroll", checkSticky);
    requestAnimationFrame(checkSticky);

    return () => {
      scrollContainer?.removeEventListener("scroll", checkSticky);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

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
