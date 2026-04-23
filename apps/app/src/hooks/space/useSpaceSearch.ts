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
import { ensureSearchParam } from "./space-query.utils";

type DebouncedSearchState = {
  value: string;
  source: "input" | "url";
};

export function useSpaceSearch(
  searchUrlSlug: string | null,
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void
) {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState<DebouncedSearchState>({
    value: "",
    source: "input",
  });
  const debouncedSearchValue = debouncedSearch.value;
  const searchParamsRef = useRef(searchParams);
  const debouncedSearchValueRef = useRef(debouncedSearchValue);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    debouncedSearchValueRef.current = debouncedSearchValue;
  }, [debouncedSearchValue]);

  // Read search value from URL on initial mount only
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (!searchUrlSlug || !isInitialMount.current) return;

    const urlValue = searchParams.get(searchUrlSlug);

    if (urlValue) {
      setSearchValue(urlValue);
      setDebouncedSearch({ value: urlValue, source: "url" });
    }

    isInitialMount.current = false;
  }, [searchUrlSlug, searchParams]);

  // Keep local search state in sync when URL changes EXTERNALLY (browser back /
  // forward, another writer). Only depends on searchParams — using
  // debouncedSearchValue in deps caused a visible placeholder blink: when the
  // input-debounce fires, debouncedSearchValue changes a render BEFORE the URL
  // writer runs, this effect would see a stale empty URL value and reset the
  // input to "" until the next cycle corrected it back.
  useEffect(() => {
    if (!searchUrlSlug || isInitialMount.current) return;

    const urlValue = searchParams.get(searchUrlSlug) || "";
    if (urlValue !== debouncedSearchValueRef.current) {
      setSearchValue(urlValue);
      setDebouncedSearch({ value: urlValue, source: "url" });
    }
  }, [searchParams, searchUrlSlug]);

  // Debounce search value (faster on delete, slower on typing)
  useEffect(() => {
    const isDeleting = searchValue.length < debouncedSearchValue.length;
    const delay = isDeleting ? 500 : 700;

    const timer = setTimeout(() => {
      if (searchValue.length === 0 || searchValue.length >= 2) {
        setDebouncedSearch({ value: searchValue, source: "input" });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [searchValue, debouncedSearchValue.length]);

  // Update URL when debounced search value changes
  useEffect(() => {
    if (!searchUrlSlug) return;
    // URL-origin updates are already reflected in searchParams; writing them back can
    // race with stale URL snapshots and toggle filters on/off.
    if (debouncedSearch.source === "url") return;

    const trimmedValue = debouncedSearchValue.trim();
    const currentSearchParams = searchParamsRef.current;
    const nextParams = trimmedValue
      ? ensureSearchParam(currentSearchParams, searchUrlSlug, trimmedValue)
      : (() => {
          if (!currentSearchParams.has(searchUrlSlug)) {
            return null;
          }
          const params = new URLSearchParams(currentSearchParams);
          params.delete(searchUrlSlug);
          return params;
        })();

    if (nextParams) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [debouncedSearch.source, debouncedSearchValue, searchUrlSlug, setSearchParams]);

  return { searchValue, setSearchValue, debouncedSearchValue };
}
