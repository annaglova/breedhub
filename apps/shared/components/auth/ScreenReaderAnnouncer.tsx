import { useEffect, useRef } from "react";
import { cn } from "@ui/lib/utils";

interface ScreenReaderAnnouncerProps {
  message: string;
  priority?: "polite" | "assertive";
  clearAfter?: number;
  className?: string;
}

/**
 * Component for announcing messages to screen readers
 * Uses ARIA live regions to announce dynamic content changes
 */
export function ScreenReaderAnnouncer({
  message,
  priority = "polite",
  clearAfter = 5000,
  className,
}: ScreenReaderAnnouncerProps) {
  const announcerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (message && announcerRef.current) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Announce the message
      announcerRef.current.textContent = message;

      // Clear the message after specified time
      if (clearAfter > 0) {
        timeoutRef.current = setTimeout(() => {
          if (announcerRef.current) {
            announcerRef.current.textContent = "";
          }
        }, clearAfter);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={cn("sr-only", className)}
    />
  );
}

/**
 * Hook for programmatic screen reader announcements
 */
export function useScreenReaderAnnounce() {
  const announcePolite = (message: string) => {
    const announcer = document.createElement("div");
    announcer.setAttribute("role", "status");
    announcer.setAttribute("aria-live", "polite");
    announcer.className = "sr-only";
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 5000);
  };

  const announceAssertive = (message: string) => {
    const announcer = document.createElement("div");
    announcer.setAttribute("role", "alert");
    announcer.setAttribute("aria-live", "assertive");
    announcer.className = "sr-only";
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 5000);
  };

  return { announcePolite, announceAssertive };
}