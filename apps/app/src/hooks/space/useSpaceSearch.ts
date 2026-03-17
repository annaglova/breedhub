/**
 * useSpaceSearch - Manages search state with debounce and URL sync.
 *
 * - Reads initial search value from URL on mount
 * - Debounces input (500ms delete, 700ms type, min 2 chars)
 * - Syncs debounced value back to URL
 *
 * Extracted from SpaceComponent.
 */
import { useEffect, useRef, useState } from "react";

export function useSpaceSearch(
  searchUrlSlug: string | null,
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void
) {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // Read search value from URL on initial mount only
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (!searchUrlSlug || !isInitialMount.current) return;

    const urlValue = searchParams.get(searchUrlSlug);

    if (urlValue) {
      setSearchValue(urlValue);
      setDebouncedSearchValue(urlValue);
    }

    isInitialMount.current = false;
  }, [searchUrlSlug, searchParams]);

  // Debounce search value (faster on delete, slower on typing)
  useEffect(() => {
    const isDeleting = searchValue.length < debouncedSearchValue.length;
    const delay = isDeleting ? 500 : 700;

    const timer = setTimeout(() => {
      if (searchValue.length === 0 || searchValue.length >= 2) {
        setDebouncedSearchValue(searchValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [searchValue, debouncedSearchValue.length]);

  // Update URL when debounced search value changes
  useEffect(() => {
    if (!searchUrlSlug) return;

    const currentValue = searchParams.get(searchUrlSlug);
    const newValue = debouncedSearchValue.trim() || null;

    if (currentValue !== newValue) {
      const newParams = new URLSearchParams(searchParams);

      if (debouncedSearchValue.trim()) {
        newParams.set(searchUrlSlug, debouncedSearchValue.trim());
      } else {
        newParams.delete(searchUrlSlug);
      }

      setSearchParams(newParams, { replace: true });
    }
  }, [debouncedSearchValue, searchUrlSlug, searchParams, setSearchParams]);

  return { searchValue, setSearchValue, debouncedSearchValue };
}
