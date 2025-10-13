import React, { forwardRef, useState, useRef, useEffect, useCallback } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Search, X, Loader2 } from "lucide-react";
import { dictionaryStore } from "@breedhub/rxdb-store";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [dynamicOptions, setDynamicOptions] = useState<LookupOption[]>(options);
    const [internalLoading, setInternalLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownListRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    const prevSearchQueryRef = useRef<string>('');
    const offsetRef = useRef<number>(0); // Keep offset in sync with state for immediate access

    const loading = externalLoading || internalLoading;

    const loadDictionaryOptions = useCallback(async (query: string = '', append: boolean = false) => {
      if (!referencedTable) return;

      setInternalLoading(true);

      try {
        // Read current offset from ref for immediate access
        const currentOffset = append ? offsetRef.current : 0;

        console.log('[LookupInput] Loading dictionary:', referencedTable, 'search:', query, 'offset:', currentOffset);

        const { records, hasMore: more } = await dictionaryStore.getDictionary(referencedTable, {
          idField: referencedFieldID,
          nameField: referencedFieldName,
          search: query,
          limit: 30,
          offset: currentOffset
        });

        const opts: LookupOption[] = records.map(record => ({
          value: record.id,
          label: record.name
        }));

        console.log('[LookupInput] Loaded options:', opts.length, 'hasMore:', more);

        if (append) {
          // Filter out duplicates when appending
          setDynamicOptions(prev => {
            const existingIds = new Set(prev.map(o => o.value));
            const newOptions = opts.filter(o => !existingIds.has(o.value));
            return [...prev, ...newOptions];
          });
          const newOffset = currentOffset + 30;
          setOffset(newOffset);
          offsetRef.current = newOffset;
        } else {
          setDynamicOptions(opts);
          setOffset(30);
          offsetRef.current = 30;
        }

        setHasMore(more);
      } catch (error) {
        console.error(`[LookupInput] Failed to load dictionary ${referencedTable}:`, error);
      } finally {
        setInternalLoading(false);
      }
    }, [referencedTable, referencedFieldID, referencedFieldName]);

    // Load dictionary data on focus/search
    useEffect(() => {
      if (isOpen && referencedTable && dynamicOptions.length === 0) {
        loadDictionaryOptions();
      }
    }, [isOpen, referencedTable, dynamicOptions.length, loadDictionaryOptions]);

    // Debounced search
    useEffect(() => {
      if (!referencedTable) return;

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      const prevQuery = prevSearchQueryRef.current;
      prevSearchQueryRef.current = searchQuery;

      // Only reset and reload when search query actually changes
      if (searchQuery !== prevQuery) {
        if (searchQuery) {
          // Search query entered - reset and load with search
          setDynamicOptions([]);
          setOffset(0);
          offsetRef.current = 0; // Keep ref in sync

          searchTimeoutRef.current = setTimeout(() => {
            loadDictionaryOptions(searchQuery, false);
          }, 300);
        } else if (prevQuery) {
          // Search cleared - reload initial data
          setDynamicOptions([]);
          setOffset(0);
          offsetRef.current = 0; // Keep ref in sync
          loadDictionaryOptions('', false);
        }
      }

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }, [searchQuery, referencedTable, loadDictionaryOptions]);

    // Use dynamic options if available, otherwise static options
    const currentOptions = referencedTable ? dynamicOptions : options;

    // Find selected option
    const selectedOption = currentOptions.find(opt => opt.value === value);

    // Filter options based on search (only if not using server-side search)
    const filteredOptions = referencedTable ? currentOptions : currentOptions.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (option.description && option.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Handle clicks outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      setIsOpen(true);
      setHighlightedIndex(0);
      onSearch?.(query);
    };

    const handleSelect = (option: LookupOption) => {
      onValueChange?.(option.value);
      setSearchQuery(option.label);
      setIsOpen(false);
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
        loadDictionaryOptions(searchQuery, true);
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
            value={searchQuery || selectedOption?.label || ""}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
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
          {!loading && isOpen && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
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