import { useEffect, useRef } from "react";
import { cn } from "@ui/lib/utils";

interface ScrollableTabProps {
  id: string;
  children: React.ReactNode;
  onVisibilityChange?: (id: string, visibility: number) => void;
  className?: string;
}

/**
 * ScrollableTab - Wrapper для tab content з visibility tracking
 *
 * REFERENCE: /Users/annaglova/projects/org/libs/schema/ui/scrollable-tab-ui/scrollable-tab.directive.ts
 *
 * Features:
 * - IntersectionObserver для tracking visibility (0.0 - 1.0)
 * - Викликає onVisibilityChange(id, intersectionRatio)
 * - ID для scroll targeting
 */
export function ScrollableTab({
  id,
  children,
  onVisibilityChange,
  className,
}: ScrollableTabProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !onVisibilityChange) return;

    // Create observer with fine-grained thresholds
    const observer = new IntersectionObserver(
      ([entry]) => {
        // intersectionRatio = 0.0 (not visible) to 1.0 (fully visible)
        onVisibilityChange(id, entry.intersectionRatio);
      },
      {
        // Track visibility at 1% increments: 0.00, 0.01, 0.02, ... 1.00
        threshold: Array.from({ length: 101 }, (_, i) => i / 100),
        rootMargin: "0px",
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [id, onVisibilityChange]);

  return (
    <div
      ref={ref}
      id={`tab-${id}`}
      className={cn("scroll-mt-20", className)}
    >
      {children}
    </div>
  );
}
