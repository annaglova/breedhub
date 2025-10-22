import React, { forwardRef, useState, useRef, useEffect, useCallback } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Search, X, Loader2 } from "lucide-react";
import { dictionaryStore, spaceStore } from "@breedhub/rxdb-store";

interface LookupOption {
  value: string;
  label: string;
  description?: string;
}

interface LookupInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  options?: LookupOption[]; // Now optional - can be loaded from dictionary
  value?: string;
  onValueChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  fieldClassName?: string;
  // Dictionary loading props
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  dataSource?: 'collection' | 'dictionary'; // Default: dictionary
}

export const LookupInput = forwardRef<HTMLInputElement, LookupInputProps>(
  ({
    label,
    error,
    helperText,
    required,
    options = [],
    value,
    onValueChange,
    onSearch,
    loading: externalLoading,
    className,
    fieldClassName,
    placeholder = "Search...",
    referencedTable,
    referencedFieldID = 'id',
    referencedFieldName = 'name',
    dataSource = 'dictionary', // Default to dictionary
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(""); // ✅ Internal input state (what user types)
    const [searchQuery, setSearchQuery] = useState(""); // ✅ Debounced search query (sent to server)
    const [isEditing, setIsEditing] = useState(false); // ✅ Track if user is typing
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [dynamicOptions, setDynamicOptions] = useState<LookupOption[]>(options);
    const [internalLoading, setInternalLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownListRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    const prevSearchQueryRef = useRef<string>('');
    const cursorRef = useRef<string | null>(null); // ✅ Keyset pagination: last seen value
    const isLoadingRef = useRef(false); // 🔒 Prevent race conditions

    const loading = externalLoading || internalLoading;

    // Use dynamic options if available, otherwise static options
    const currentOptions = referencedTable ? dynamicOptions : options;

    // ✅ Deduplicate options (handles race conditions between scroll/replication)
    const deduplicatedOptions = React.useMemo(() => {
      const seen = new Map<string, LookupOption>();
      currentOptions.forEach(opt => {
        if (!seen.has(opt.value)) {
          seen.set(opt.value, opt);
        }
      });
      return Array.from(seen.values());
    }, [currentOptions]);

    // Find selected option
    const selectedOption = deduplicatedOptions.find(opt => opt.value === value);

    const loadDictionaryOptions = useCallback(async (query: string = '', append: boolean = false) => {
      if (!referencedTable) return;

      // 🔒 CRITICAL: Prevent multiple simultaneous calls (race condition fix)
      if (isLoadingRef.current) {
        console.log('[LookupInput] ⚠️ Already loading, skipping duplicate call');
        return;
      }

      isLoadingRef.current = true;
      setInternalLoading(true);

      try {
        // ✅ KEYSET PAGINATION: Use cursor instead of offset
        const currentCursor = append ? cursorRef.current : null;

        let opts: LookupOption[] = [];
        let more = false;
        let nextCursor: string | null = null;

        if (dataSource === 'collection') {
          // Mode: Use SpaceStore.applyFilters() for main entities
          console.log('[LookupInput] Loading from collection via SpaceStore:', referencedTable, 'search:', query, 'cursor:', currentCursor);

          // Build filters object for applyFilters
          const filters: Record<string, any> = {};
          if (query) {
            filters[referencedFieldName] = query;
          }

          // Call universal filtering method with keyset pagination
          const result = await spaceStore.applyFilters(
            referencedTable,
            filters,
            {
              limit: 30,
              cursor: currentCursor,
              orderBy: { field: 'name', direction: 'asc' }  // Always A-Z for search/selection
            }
          );

          opts = result.records.map((record: any) => ({
            value: String(record[referencedFieldID]),
            label: String(record[referencedFieldName])
          }));

          more = result.hasMore;
          nextCursor = result.nextCursor;

          console.log('[LookupInput] Loaded from SpaceStore:', opts.length, 'hasMore:', more, 'nextCursor:', nextCursor);
        } else {
          // Mode: Use DictionaryStore with ID-First pagination ✅
          const currentCursor = append ? cursorRef.current : null;
          console.log('[LookupInput] Loading from dictionary (ID-First):', referencedTable, 'search:', query, 'cursor:', currentCursor);

          const { records, hasMore: dictHasMore, nextCursor: dictNextCursor } = await dictionaryStore.getDictionary(referencedTable, {
            idField: referencedFieldID,
            nameField: referencedFieldName,
            search: query,
            limit: 30,
            cursor: currentCursor  // ✅ Use cursor instead of offset
          });

          opts = records.map(record => ({
            value: record.id,
            label: record.name
          }));

          more = dictHasMore;
          nextCursor = dictNextCursor;  // ✅ Get nextCursor from DictionaryStore

          console.log('[LookupInput] Loaded from dictionary:', opts.length, 'hasMore:', more, 'nextCursor:', nextCursor);
        }

        if (append) {
          // ✅ ID-First ensures no duplicates - trust the server response
          setDynamicOptions(prev => [...prev, ...opts]);
        } else {
          setDynamicOptions(opts);
        }

        // ✅ Always trust nextCursor from server (ID-First returns correct cursor)
        cursorRef.current = nextCursor;

        setHasMore(more);
      } catch (error) {
        console.error(`[LookupInput] Failed to load ${dataSource === 'collection' ? 'collection' : 'dictionary'} ${referencedTable}:`, error);
      } finally {
        isLoadingRef.current = false; // 🔒 Release lock
        setInternalLoading(false);
      }
    }, [referencedTable, referencedFieldID, referencedFieldName, dataSource]);

    // ✅ Sync inputValue with selectedOption when value changes externally
    useEffect(() => {
      if (!isEditing && selectedOption) {
        setInputValue(selectedOption.label);
      } else if (!value) {
        setInputValue('');
      }
    }, [value, selectedOption, isEditing]);

    // Load dictionary data on focus/search
    useEffect(() => {
      if (isOpen && referencedTable && dynamicOptions.length === 0) {
        loadDictionaryOptions();
      }
    }, [isOpen, referencedTable, dynamicOptions.length, loadDictionaryOptions]);

    // ✅ Debounced search - trigger on inputValue change ONLY when editing
    useEffect(() => {
      if (!referencedTable || !isEditing) return;

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      const prevQuery = prevSearchQueryRef.current;
      const currentQuery = inputValue.trim();

      // Only reset and reload when search query actually changes
      if (currentQuery !== prevQuery) {
        prevSearchQueryRef.current = currentQuery;

        // Debounce: wait 500ms after user stops typing
        searchTimeoutRef.current = setTimeout(() => {
          console.log('[LookupInput] 🔍 Debounced search triggered:', currentQuery);
          setSearchQuery(currentQuery);
          setDynamicOptions([]);
          cursorRef.current = null; // ✅ Reset cursor
          loadDictionaryOptions(currentQuery, false);
        }, 500); // ✅ 500ms debounce
      }

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }, [inputValue, isEditing, referencedTable, loadDictionaryOptions]);

    // Filter options based on search (only if not using server-side search)
    const filteredOptions = referencedTable ? deduplicatedOptions : deduplicatedOptions.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase()) ||
      (option.description && option.description.toLowerCase().includes(inputValue.toLowerCase()))
    );

    // Handle clicks outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          // ✅ Exit editing mode and restore selected value
          if (value && selectedOption) {
            setInputValue(selectedOption.label);
            setIsEditing(false);
          }
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, selectedOption]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setInputValue(query); // ✅ Update input value immediately (no flicker)
      setIsEditing(true); // ✅ Mark as editing
      setIsOpen(true);
      setHighlightedIndex(0);
      onSearch?.(query);
    };

    const handleSelect = (option: LookupOption) => {
      onValueChange?.(option.value);
      setInputValue(option.label); // ✅ Set selected label
      setIsEditing(false); // ✅ Stop editing mode
      setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onValueChange?.('');
      setInputValue(''); // ✅ Clear input
      setIsEditing(false); // ✅ Not editing after clear
      // ❌ Don't open dropdown - user can click to open if needed
    };

    const handleFocus = () => {
      setIsOpen(true);
      if (!isEditing && value) {
        // ✅ On focus with selected value - clear input for typing
        setInputValue('');
        setIsEditing(true);
      }
    };

    const handleBlur = () => {
      // ✅ Delay to allow handleSelect to execute first (when clicking option)
      setTimeout(() => {
        // On blur - restore selected option label if input is empty but has value
        if (!inputValue && value && selectedOption) {
          setInputValue(selectedOption.label);
          setIsEditing(false);
        }
      }, 200);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          break;
      }
    };

    const handleScroll = useCallback(() => {
      if (!dropdownListRef.current) return;
      if (!referencedTable || !hasMore || loading) return;

      const scrollElement = dropdownListRef.current;
      const scrollBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;

      // Load more when scrolled to bottom (with 50px threshold)
      if (scrollBottom < 50) {
        console.log('[LookupInput] Scroll to bottom, loading more...', 'searchQuery:', searchQuery);
        loadDictionaryOptions(searchQuery, true); // ✅ Use debounced searchQuery
      }
    }, [referencedTable, hasMore, loading, searchQuery, loadDictionaryOptions]);

    // Set up scroll listener
    useEffect(() => {
      const scrollElement = dropdownListRef.current;
      if (!scrollElement || !isOpen) return;

      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }, [handleScroll, isOpen]);

    const inputElement = (
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <Input
            ref={ref}
            type="text"
            value={isEditing ? inputValue : (selectedOption?.label || "")}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "pl-10 pr-10",
              className
            )}
            {...props}
          />
          {loading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
          {!loading && value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {isOpen && filteredOptions.length > 0 && (
          <div
            ref={dropdownListRef}
            className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-[40vh] overflow-auto"
          >
            {/* 🔍 DEBUG: Total count */}
            <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-100 bg-gray-50 sticky top-0">
              Showing {filteredOptions.length} breeds
            </div>
            {filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option)}
                className={cn(
                  "px-3 py-2 text-base cursor-pointer transition-colors",
                  "hover:bg-gray-100",
                  highlightedIndex === index && "bg-gray-100",
                  option.value === value && "bg-primary-50 text-primary-700"
                )}
              >
                <div className="!text-[16px] font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-500">{option.description}</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="px-3 py-2 text-center text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                Loading more...
              </div>
            )}
            {!hasMore && filteredOptions.length > 0 && (
              <div className="px-3 py-2 text-center text-sm text-gray-400">
                No more results
              </div>
            )}
          </div>
        )}

        {isOpen && filteredOptions.length === 0 && !loading && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="px-3 py-2 text-gray-500 text-center">
              No results found
            </div>
          </div>
        )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <FormField
          label={label}
          error={error}
          helperText={!error ? helperText : undefined}
          required={required}
          className={fieldClassName}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

LookupInput.displayName = "LookupInput";