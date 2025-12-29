import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@ui/lib/utils";

interface HorizontalScrollbarProps {
  /** Reference to the scrollable container */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** Additional class names */
  className?: string;
}

/**
 * HorizontalScrollbar - Custom scrollbar that syncs with a scrollable container
 *
 * Visual style similar to BreedProgressLight - rounded border with thumb inside.
 * Supports both click-to-scroll and drag-to-scroll on the thumb.
 */
export function HorizontalScrollbar({
  scrollContainerRef,
  className,
}: HorizontalScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(20);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);

  // Calculate thumb size and position based on scroll container
  const updateThumb = useCallback(() => {
    const container = scrollContainerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const { scrollWidth, clientWidth, scrollLeft } = container;

    // Check if scrolling is needed
    if (scrollWidth <= clientWidth) {
      setIsVisible(false);
      return;
    }
    setIsVisible(true);

    const trackWidth = track.clientWidth;

    // Calculate thumb width as proportion of visible area
    const thumbW = Math.max((clientWidth / scrollWidth) * trackWidth, 30);
    setThumbWidth(thumbW);

    // Calculate thumb position
    const maxScroll = scrollWidth - clientWidth;
    const maxThumbLeft = trackWidth - thumbW;
    const thumbL = (scrollLeft / maxScroll) * maxThumbLeft;
    setThumbLeft(thumbL);
  }, [scrollContainerRef]);

  // Listen to scroll events - with retry logic for delayed container availability
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let retryCount = 0;
    const maxRetries = 20; // 20 * 50ms = 1 second max wait

    const setupListeners = () => {
      const container = scrollContainerRef.current;
      if (!container) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupListeners, 50);
        }
        return;
      }

      updateThumb();
      container.addEventListener("scroll", updateThumb);
      window.addEventListener("resize", updateThumb);

      // Use ResizeObserver for container size changes
      const resizeObserver = new ResizeObserver(updateThumb);
      resizeObserver.observe(container);

      cleanup = () => {
        container.removeEventListener("scroll", updateThumb);
        window.removeEventListener("resize", updateThumb);
        resizeObserver.disconnect();
      };
    };

    setupListeners();

    return () => {
      cleanup?.();
    };
  }, [scrollContainerRef, updateThumb]);

  // Handle thumb drag
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = scrollContainerRef.current?.scrollLeft || 0;
  };

  // Handle track click (jump to position)
  const handleTrackClick = (e: React.MouseEvent) => {
    const track = trackRef.current;
    const container = scrollContainerRef.current;
    if (!track || !container) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackWidth = track.clientWidth;

    const { scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    // Calculate scroll position from click
    const scrollTo = (clickX / trackWidth) * maxScroll;
    container.scrollTo({ left: scrollTo, behavior: "smooth" });
  };

  // Global mouse move/up handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const track = trackRef.current;
      const container = scrollContainerRef.current;
      if (!track || !container) return;

      const deltaX = e.clientX - dragStartX.current;
      const trackWidth = track.clientWidth;
      const { scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;
      const maxThumbLeft = trackWidth - thumbWidth;

      // Convert thumb movement to scroll movement
      const scrollDelta = (deltaX / maxThumbLeft) * maxScroll;
      container.scrollLeft = dragStartScrollLeft.current + scrollDelta;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, scrollContainerRef, thumbWidth]);

  if (!isVisible) return null;

  return (
    <div
      ref={trackRef}
      className={cn(
        "h-[10px] w-full rounded-full border border-primary-500 cursor-pointer relative",
        className
      )}
      onClick={handleTrackClick}
    >
      <div
        className={cn(
          "absolute top-0.5 bottom-0.5 rounded-full bg-primary-500 cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        style={{
          width: `${thumbWidth}px`,
          left: `${thumbLeft}px`,
        }}
        onMouseDown={handleThumbMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
