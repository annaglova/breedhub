import { useEffect, useState, useRef, RefObject } from "react";

interface UseAutoFillDetectionOptions {
  onAutoFill?: (isAutoFilled: boolean) => void;
  checkInterval?: number;
}

export function useAutoFillDetection<T extends HTMLInputElement>(
  ref: RefObject<T>,
  options: UseAutoFillDetectionOptions = {}
) {
  const { onAutoFill, checkInterval = 200 } = options;
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const input = ref.current;

    // Method 1: Use the :autofill pseudo-class with JavaScript
    const checkAutoFillWithCSS = () => {
      try {
        // Check if the input matches the :autofill pseudo-class
        const isAutofilled = input.matches("input:-webkit-autofill") || 
                           input.matches("input:autofill");
        
        if (isAutofilled !== isAutoFilled) {
          setIsAutoFilled(isAutofilled);
          onAutoFill?.(isAutofilled);
        }
      } catch (e) {
        // Fallback if :autofill is not supported
        checkAutoFillFallback();
      }
    };

    // Method 2: Fallback detection based on value changes
    const checkAutoFillFallback = () => {
      // Check if input has value but no focus/blur events fired
      const hasValue = input.value && input.value.length > 0;
      const computedStyles = window.getComputedStyle(input);
      
      // Chrome/Edge specific: background color changes on autofill
      const bgColor = computedStyles.backgroundColor;
      const isYellowish = bgColor.includes("rgb(232, 240, 254)") || 
                         bgColor.includes("rgba(232, 240, 254");
      
      const detected = hasValue && (isYellowish || input.dataset.autofilled === "true");
      
      if (detected !== isAutoFilled) {
        setIsAutoFilled(detected);
        onAutoFill?.(detected);
      }
    };

    // Method 3: Animation-based detection
    const setupAnimationDetection = () => {
      // Add animation that triggers on autofill
      const style = document.createElement("style");
      style.textContent = `
        @keyframes autofillDetection {
          from { opacity: 1; }
          to { opacity: 1; }
        }
        input:-webkit-autofill {
          animation: autofillDetection 0.1s;
        }
      `;
      document.head.appendChild(style);

      const handleAnimationStart = (e: AnimationEvent) => {
        if (e.animationName === "autofillDetection") {
          setIsAutoFilled(true);
          onAutoFill?.(true);
          input.dataset.autofilled = "true";
        }
      };

      input.addEventListener("animationstart", handleAnimationStart);

      return () => {
        input.removeEventListener("animationstart", handleAnimationStart);
        style.remove();
      };
    };

    // Method 4: Check on various events
    const handleChange = () => {
      // Delay check to allow browser to update styles
      setTimeout(checkAutoFillWithCSS, 10);
    };

    const handleBlur = () => {
      // Reset autofill detection on blur if input is empty
      if (!input.value) {
        setIsAutoFilled(false);
        onAutoFill?.(false);
        delete input.dataset.autofilled;
      }
    };

    // Set up all detection methods
    const cleanupAnimation = setupAnimationDetection();
    
    // Set up periodic check for autofill
    intervalRef.current = setInterval(checkAutoFillWithCSS, checkInterval);
    
    // Listen to events
    input.addEventListener("change", handleChange);
    input.addEventListener("blur", handleBlur);
    
    // Initial check
    checkAutoFillWithCSS();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      input.removeEventListener("change", handleChange);
      input.removeEventListener("blur", handleBlur);
      cleanupAnimation();
    };
  }, [ref, isAutoFilled, onAutoFill, checkInterval]);

  return isAutoFilled;
}