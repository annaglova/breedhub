import { useEffect, useCallback } from "react";

interface KeyboardNavigationOptions {
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onTab?: (event: KeyboardEvent) => void;
  enabled?: boolean;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onArrowLeft,
    onArrowRight,
    onArrowUp,
    onArrowDown,
    onEnter,
    onEscape,
    onTab,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if the target is an input element
      const target = event.target as HTMLElement;
      const isInputElement = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Don't handle arrow keys if user is typing in an input
      if (isInputElement && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          if (onArrowLeft) {
            event.preventDefault();
            onArrowLeft();
          }
          break;
        case "ArrowRight":
          if (onArrowRight) {
            event.preventDefault();
            onArrowRight();
          }
          break;
        case "ArrowUp":
          if (onArrowUp) {
            event.preventDefault();
            onArrowUp();
          }
          break;
        case "ArrowDown":
          if (onArrowDown) {
            event.preventDefault();
            onArrowDown();
          }
          break;
        case "Enter":
          if (onEnter && !isInputElement) {
            event.preventDefault();
            onEnter();
          }
          break;
        case "Escape":
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
        case "Tab":
          if (onTab) {
            onTab(event);
          }
          break;
      }
    },
    [enabled, onArrowLeft, onArrowRight, onArrowUp, onArrowDown, onEnter, onEscape, onTab]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  return {
    handleKeyDown,
  };
}