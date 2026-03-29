import { dictionaryStore } from "@breedhub/rxdb-store";
import { cn } from "@ui/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FormField } from "../form-field";
import { Input } from "../input";

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
  > {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
  options?: DropdownOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  fieldClassName?: string;
  touched?: boolean;
  // Dictionary loading props
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  // Cascade filtering props (filter options by parent field value)
  filterBy?: string;        // Field name to filter on (e.g. 'pet_type_id')
  filterByValue?: string;   // Parent value to match (e.g. selected pet_type UUID)
  // Junction table filtering (many-to-many: filter by allowed IDs from junction table)
  filterByIds?: string[] | null; // Allowed IDs from junction table query (null = no filtering)
  // Style variant for disabled state
  disabledOnGray?: boolean; // Use white background when disabled (for gray backgrounds)
}

export const DropdownInput = forwardRef<HTMLInputElement, DropdownInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      placeholder = "Select an option",
      options = [],
      value,
      onValueChange,
      disabled,
      className,
      fieldClassName,
      touched,
      referencedTable,
      referencedFieldID = "id",
      referencedFieldName = "name",
      filterBy,
      filterByValue,
      filterByIds,
      disabledOnGray,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dynamicOptions, setDynamicOptions] =
      useState<DropdownOption[]>(options);
    const [cursor, setCursor] = useState<string | null>(null); // ✅ Cursor instead of offset
    const [hasMore, setHasMore] = useState(true);
    const [cachedSelectedOption, setCachedSelectedOption] =
      useState<DropdownOption | null>(null); // ✅ Cache selected option (like LookupInput)
    const [filterValueMap, setFilterValueMap] = useState<Map<string, string>>(new Map()); // filterBy field values per option
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownListRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    // Validation state
    const hasError = touched && !!error;

    // Use dynamic options if referencedTable is provided, otherwise use static options
    const activeOptions = referencedTable ? dynamicOptions : options;

    // Filter options by filterByValue (cascade) and/or filterByIds (junction table)
    const filteredOptions = useMemo(() => {
      let result = activeOptions;

      // Cascade filtering by parent field value
      if (filterBy && filterByValue) {
        result = result.filter(opt => filterValueMap.get(opt.value) === filterByValue);
      }

      // Junction table filtering by allowed IDs
      if (filterByIds && filterByIds.length > 0) {
        const allowedSet = new Set(filterByIds);
        result = result.filter(opt => allowedSet.has(opt.value));
      }

      return result;
    }, [activeOptions, filterBy, filterByValue, filterValueMap, filterByIds]);

    // Move selected option to the top of the list
    const displayOptions = useMemo(() => {
      if (!value || !filteredOptions.length) return filteredOptions;
      const selected = filteredOptions.find(opt => opt.value === value);
      if (!selected) return filteredOptions;
      return [selected, ...filteredOptions.filter(opt => opt.value !== value)];
    }, [filteredOptions, value]);

    // Find selected option - use cached version if available, otherwise search in options
    const selectedOption =
      cachedSelectedOption?.value === value
        ? cachedSelectedOption
        : activeOptions?.find((opt) => opt.value === value);

    const loadDictionaryOptions = useCallback(
      async (append: boolean = false) => {
        if (!referencedTable) return;

        setLoading(true);

        try {
          const currentCursor = append ? cursor : null; // ✅ Use cursor
          console.log(
            "[DropdownInput] Loading dictionary (ID-First):",
            referencedTable,
            "cursor:",
            currentCursor
          );

          const {
            records,
            hasMore: more,
            nextCursor,
          } = await dictionaryStore.getDictionary(referencedTable, {
            idField: referencedFieldID,
            nameField: referencedFieldName,
            limit: 30,
            cursor: currentCursor, // ✅ Pass cursor instead of offset
            additionalFields: filterBy ? [filterBy] : undefined,
          });

          // Transform to dropdown options
          const opts: DropdownOption[] = records.map((record) => ({
            value: record.id,
            label: record.name,
          }));

          // Build filterBy field values map for cascade filtering
          if (filterBy) {
            const newFilterValues = new Map<string, string>();
            const missingFilterRecords: string[] = [];

            for (const record of records) {
              const fv = record.additional?.[filterBy];
              if (fv) {
                newFilterValues.set(record.id, String(fv));
              } else {
                missingFilterRecords.push(record.id);
              }
            }

            // Resolve missing filter values (cached records without additional field)
            if (missingFilterRecords.length > 0) {
              for (const id of missingFilterRecords) {
                const fullRecord = await dictionaryStore.getRecordById(referencedTable, id);
                if (fullRecord?.[filterBy]) {
                  newFilterValues.set(id, String(fullRecord[filterBy]));
                }
              }
            }

            setFilterValueMap(prev => {
              if (append) {
                const merged = new Map(prev);
                newFilterValues.forEach((v, k) => merged.set(k, v));
                return merged;
              }
              return newFilterValues;
            });
          }

          console.log(
            "[DropdownInput] Loaded options:",
            opts.length,
            "hasMore:",
            more,
            "nextCursor:",
            nextCursor
          );

          if (append) {
            // Deduplicate by value (ID) to prevent React key warnings
            setDynamicOptions((prev) => {
              const existingIds = new Set(prev.map((opt) => opt.value));
              const newOpts = opts.filter((opt) => !existingIds.has(opt.value));
              return [...prev, ...newOpts];
            });
          } else {
            setDynamicOptions(opts);
          }

          setCursor(nextCursor); // ✅ Save nextCursor for next scroll
          setHasMore(more);
        } catch (error) {
          console.error(`Failed to load dictionary ${referencedTable}:`, error);
        } finally {
          setLoading(false);
        }
      },
      [referencedTable, referencedFieldID, referencedFieldName, cursor, filterBy]
    );

    // Pre-load dictionary data on mount (for small dictionaries like pet_type)
    useEffect(() => {
      if (referencedTable && dynamicOptions.length === 0) {
        loadDictionaryOptions();
      }
    }, [referencedTable]); // eslint-disable-line react-hooks/exhaustive-deps

    // ✅ Pre-load ONLY the selected record by ID (like LookupInput)
    // This is instant - no need to load all options
    useEffect(() => {
      if (value && !selectedOption && referencedTable && !loading) {
        console.log("[DropdownInput] Pre-loading selected value:", value);

        const loadSelectedRecord = async () => {
          try {
            const record = await dictionaryStore.getRecordById(referencedTable, value);
            if (record) {
              const option: DropdownOption = {
                value: record[referencedFieldID] as string,
                label: record[referencedFieldName] as string,
              };
              setCachedSelectedOption(option);
              console.log("[DropdownInput] Cached selected option:", option.label);
            }
          } catch (error) {
            console.error("[DropdownInput] Failed to pre-load selected value:", error);
          }
        };

        loadSelectedRecord();
      }
    }, [value, selectedOption, referencedTable, referencedFieldID, referencedFieldName, loading]);

    // Handle clicks outside — check both trigger and portal dropdown
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        const inTrigger = triggerRef.current?.contains(target);
        const inDropdown = dropdownListRef.current?.contains(target);
        if (!inTrigger && !inDropdown) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option: DropdownOption) => {
      if (!option.disabled) {
        onValueChange?.(option.value);
        setCachedSelectedOption(option); // ✅ Cache selected option
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onValueChange?.("");
      setCachedSelectedOption(null); // ✅ Clear cache
    };

    const handleScroll = useCallback(() => {
      if (!dropdownListRef.current) {
        console.log("[DropdownInput] handleScroll: no ref");
        return;
      }

      const scrollElement = dropdownListRef.current;
      const scrollBottom =
        scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight;

      console.log("[DropdownInput] Scroll event:", {
        scrollBottom,
        hasMore,
        loading,
        cursor,
        referencedTable,
      });

      if (!referencedTable || !hasMore || loading) {
        console.log("[DropdownInput] Scroll blocked:", {
          referencedTable,
          hasMore,
          loading,
        });
        return;
      }

      // Load more when scrolled to bottom (with 50px threshold)
      if (scrollBottom < 50) {
        console.log(
          "[DropdownInput] Scroll to bottom, loading more... cursor:",
          cursor
        );
        loadDictionaryOptions(true);
      }
    }, [referencedTable, hasMore, loading, cursor, loadDictionaryOptions]);

    // Set up scroll listener + bypass react-remove-scroll lock
    useEffect(() => {
      const scrollElement = dropdownListRef.current;
      if (!scrollElement || !isOpen) {
        return;
      }

      scrollElement.addEventListener("scroll", handleScroll);

      // Stop wheel event propagation to prevent react-remove-scroll from blocking scroll
      const stopWheelPropagation = (e: WheelEvent) => {
        e.stopPropagation();
      };
      scrollElement.addEventListener("wheel", stopWheelPropagation);

      return () => {
        scrollElement.removeEventListener("scroll", handleScroll);
        scrollElement.removeEventListener("wheel", stopWheelPropagation);
      };
    }, [handleScroll, isOpen]);

    const handleToggle = useCallback(() => {
      if (disabled) return;
      if (!isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
      setIsOpen(!isOpen);
    }, [disabled, isOpen]);

    const selectElement = (
      <div className="group/field relative" ref={triggerRef}>
        <div
          className="relative cursor-pointer"
          onClick={handleToggle}
        >
          <Input
            ref={ref}
            type="text"
            value={selectedOption?.label || ""}
            placeholder={placeholder}
            readOnly
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              "peer cursor-pointer pr-10 transition-all duration-200",
              disabled &&
                !disabledOnGray &&
                "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed",
              disabled &&
                disabledOnGray &&
                "bg-white/95 border-slate-300 text-slate-400 cursor-not-allowed",
              hasError &&
                "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
              !hasError &&
                !disabled &&
                "border-slate-300 hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
              className
            )}
            style={{ caretColor: "transparent" }}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-invalid={hasError ? "true" : undefined}
            {...props}
          />
          <div
            className={cn(
              "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors",
              hasError ? "text-red-400" : "text-slate-400"
            )}
          >
            {value && !required ? (
              <button
                type="button"
                onClick={handleClear}
                className="hover:text-slate-600 pointer-events-auto"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform pointer-events-none",
                  isOpen && "rotate-180"
                )}
              />
            )}
          </div>
        </div>

        {isOpen && createPortal(
          <div
            ref={dropdownListRef}
            data-portal-dropdown
            className="fixed z-[9999] pointer-events-auto bg-white border border-slate-200 rounded-md shadow-lg overflow-auto text-base"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, maxHeight: `${Math.min(window.innerHeight * 0.4, window.innerHeight - dropdownPos.top - 8)}px` }}
          >
            {loading && dynamicOptions.length === 0 ? (
              <div className="px-3 py-2 text-slate-500 text-center">
                Loading...
              </div>
            ) : !displayOptions || displayOptions.length === 0 ? (
              <div className="px-3 py-2 text-slate-500 text-center">
                No options available
              </div>
            ) : (
              <>
                {displayOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors flex items-center justify-between",
                      "hover:bg-slate-100",
                      option.disabled && "opacity-50 cursor-not-allowed",
                      option.value === value && "bg-primary-50 text-primary-700"
                    )}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                  >
                    <span>{option.label}</span>
                    {option.value === value && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="px-3 py-2 text-center text-sm text-slate-500">
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Loading more...
                  </div>
                )}
                {!hasMore && displayOptions.length > 0 && (
                  <div className="px-3 py-2 text-center text-sm text-slate-400">
                    No more results
                  </div>
                )}
              </>
            )}
          </div>,
          document.body
        )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <FormField
          label={label}
          error={hasError ? error : undefined}
          helperText={!hasError ? helperText : undefined}
          required={required}
          className={fieldClassName}
          labelClassName={cn(
            "transition-colors",
            hasError
              ? "text-red-600"
              : "text-slate-700 group-focus-within:text-primary-600"
          )}
        >
          {selectElement}
        </FormField>
      );
    }

    return selectElement;
  }
);

DropdownInput.displayName = "DropdownInput";
