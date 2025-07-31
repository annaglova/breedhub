import { useEffect, useState, useCallback, useRef } from "react";

interface UseDebouncedValidationOptions {
  delay?: number;
  validateOnMount?: boolean;
}

export function useDebouncedValidation<T>(
  value: T,
  validator: (value: T) => Promise<string | null> | string | null,
  options: UseDebouncedValidationOptions = {}
) {
  const { delay = 500, validateOnMount = false } = options;
  
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validate = useCallback(async (valueToValidate: T) => {
    // Cancel any pending validation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this validation
    abortControllerRef.current = new AbortController();
    
    setIsValidating(true);
    setHasValidated(true);

    try {
      const result = await validator(valueToValidate);
      
      // Check if this validation was cancelled
      if (!abortControllerRef.current.signal.aborted) {
        setError(result);
        setIsValidating(false);
      }
    } catch (err) {
      // Only set error if not aborted
      if (!abortControllerRef.current.signal.aborted) {
        setError("Validation error occurred");
        setIsValidating(false);
      }
    }
  }, [validator]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip validation if value is empty and we haven't validated yet
    if (!value && !hasValidated && !validateOnMount) {
      setError(null);
      setIsValidating(false);
      return;
    }

    // Set up new timeout for debounced validation
    timeoutRef.current = setTimeout(() => {
      validate(value);
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value, delay, validate, hasValidated, validateOnMount]);

  // Manual validation trigger
  const validateNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return validate(value);
  }, [value, validate]);

  // Clear error manually
  const clearError = useCallback(() => {
    setError(null);
    setHasValidated(false);
  }, []);

  return {
    error,
    isValidating,
    hasValidated,
    validateNow,
    clearError,
  };
}