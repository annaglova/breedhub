import React, { forwardRef, useState, useRef, useEffect, useCallback } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { ChevronDown, Check, X } from "lucide-react";
import { dictionaryStore } from "@breedhub/rxdb-store";

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
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
}

export const DropdownInput = forwardRef<HTMLInputElement, DropdownInputProps>(
  ({
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
    referencedFieldID = 'id',
    referencedFieldName = 'name',
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dynamicOptions, setDynamicOptions] = useState<DropdownOption[]>(options);
    const [cursor, setCursor] = useState<string | null>(null);  // ✅ Cursor instead of offset
    const [hasMore, setHasMore] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownListRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Validation state
    const hasError = touched && !!error;

    // Use dynamic options if referencedTable is provided, otherwise use static options
    const activeOptions = referencedTable ? dynamicOptions : options;

    // Find selected option
    const selectedOption = activeOptions?.find(opt => opt.value === value);

    const loadDictionaryOptions = useCallback(async (append: boolean = false) => {
      if (!referencedTable) return;

      setLoading(true);

      try {
        const currentCursor = append ? cursor : null;  // ✅ Use cursor
        console.log('[DropdownInput] Loading dictionary (ID-First):', referencedTable, 'cursor:', currentCursor);

        const { records, hasMore: more, nextCursor } = await dictionaryStore.getDictionary(referencedTable, {
          idField: referencedFieldID,
          nameField: referencedFieldName,
          limit: 30,
          cursor: currentCursor  // ✅ Pass cursor instead of offset
        });

        // Transform to dropdown options
        const opts: DropdownOption[] = records.map(record => ({
          value: record.id,
          label: record.name
        }));

        console.log('[DropdownInput] Loaded options:', opts.length, 'hasMore:', more, 'nextCursor:', nextCursor);

        if (append) {
          // Deduplicate by value (ID) to prevent React key warnings
          setDynamicOptions(prev => {
            const existingIds = new Set(prev.map(opt => opt.value));
            const newOpts = opts.filter(opt => !existingIds.has(opt.value));
            return [...prev, ...newOpts];
          });
        } else {
          setDynamicOptions(opts);
        }

        setCursor(nextCursor);  // ✅ Save nextCursor for next scroll
        setHasMore(more);
      } catch (error) {
        console.error(`Failed to load dictionary ${referencedTable}:`, error);
      } finally {
        setLoading(false);
      }
    }, [referencedTable, referencedFieldID, referencedFieldName, cursor]);

    // Load dictionary data when dropdown opens
    useEffect(() => {
      if (isOpen && referencedTable && dynamicOptions.length === 0) {
        loadDictionaryOptions();
      }
    }, [isOpen, referencedTable, dynamicOptions.length, loadDictionaryOptions]);

    // Pre-load dictionary options if we have a value but no options yet
    // This ensures selected values are displayed correctly in forms
    useEffect(() => {
      if (value && referencedTable && dynamicOptions.length === 0 && !loading && !isOpen) {
        console.log('[DropdownInput] Pre-loading options because value exists:', value);
        loadDictionaryOptions();
      }
    }, [value, referencedTable, dynamicOptions.length, loading, isOpen, loadDictionaryOptions]);

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

    const handleSelect = (option: DropdownOption) => {
      if (!option.disabled) {
        onValueChange?.(option.value);
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
      onValueChange?.('');
    };

    const handleScroll = useCallback(() => {
      if (!dropdownListRef.current) {
        console.log('[DropdownInput] handleScroll: no ref');
        return;
      }

      const scrollElement = dropdownListRef.current;
      const scrollBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;

      console.log('[DropdownInput] Scroll event:', {
        scrollBottom,
        hasMore,
        loading,
        cursor,
        referencedTable
      });

      if (!referencedTable || !hasMore || loading) {
        console.log('[DropdownInput] Scroll blocked:', { referencedTable, hasMore, loading });
        return;
      }

      // Load more when scrolled to bottom (with 50px threshold)
      if (scrollBottom < 50) {
        console.log('[DropdownInput] Scroll to bottom, loading more... cursor:', cursor);
        loadDictionaryOptions(true);
      }
    }, [referencedTable, hasMore, loading, cursor, loadDictionaryOptions]);

    // Set up scroll listener
    useEffect(() => {
      const scrollElement = dropdownListRef.current;
      if (!scrollElement || !isOpen) {
        console.log('[DropdownInput] Scroll listener setup skipped:', { hasElement: !!scrollElement, isOpen });
        return;
      }

      console.log('[DropdownInput] Setting up scroll listener');
      scrollElement.addEventListener('scroll', handleScroll);
      return () => {
        console.log('[DropdownInput] Removing scroll listener');
        scrollElement.removeEventListener('scroll', handleScroll);
      };
    }, [handleScroll, isOpen]);

    const selectElement = (
      <div className="group/field relative" ref={dropdownRef}>
        <div
          className="relative cursor-pointer"
          onClick={() => !disabled && setIsOpen(!isOpen)}
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
              disabled && "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed",
              hasError && "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
              !hasError && !disabled && "border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
              className
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-invalid={hasError ? "true" : undefined}
            {...props}
          />
          <div className={cn(
            "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors",
            hasError ? "text-red-400" : "text-gray-400"
          )}>
            {value ? (
              <button
                type="button"
                onClick={handleClear}
                className="hover:text-gray-600 pointer-events-auto"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform pointer-events-none",
                isOpen && "rotate-180"
              )} />
            )}
          </div>
        </div>

        {isOpen && (
          <div
            ref={dropdownListRef}
            className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-[40vh] overflow-auto"
          >
            {loading && dynamicOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                Loading...
              </div>
            ) : !activeOptions || activeOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                No options available
              </div>
            ) : (
              <>
                {activeOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "px-3 py-2 text-base cursor-pointer transition-colors flex items-center justify-between",
                      "hover:bg-gray-100",
                      option.disabled && "opacity-50 cursor-not-allowed",
                      option.value === value && "bg-primary-50 text-primary-700"
                    )}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                  >
                    <span className="!text-[16px]">{option.label}</span>
                    {option.value === value && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="px-3 py-2 text-center text-sm text-gray-500">
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Loading more...
                  </div>
                )}
                {!hasMore && activeOptions.length > 0 && (
                  <div className="px-3 py-2 text-center text-sm text-gray-400">
                    No more results
                  </div>
                )}
              </>
            )}
          </div>
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
            hasError ? "text-red-600" : "text-gray-700 group-focus-within:text-primary-600"
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