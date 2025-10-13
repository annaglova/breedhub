import React, { forwardRef, useState, useRef, useEffect, useCallback } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { ChevronDown, Check } from "lucide-react";
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
    referencedTable,
    referencedFieldID = 'id',
    referencedFieldName = 'name',
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dynamicOptions, setDynamicOptions] = useState<DropdownOption[]>(options);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownListRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Use dynamic options if referencedTable is provided, otherwise use static options
    const activeOptions = referencedTable ? dynamicOptions : options;

    // Find selected option
    const selectedOption = activeOptions?.find(opt => opt.value === value);

    const loadDictionaryOptions = useCallback(async (append: boolean = false) => {
      if (!referencedTable) return;

      setLoading(true);

      try {
        const currentOffset = append ? offset : 0;
        console.log('[DropdownInput] Loading dictionary:', referencedTable, 'offset:', currentOffset);

        const { records, hasMore: more } = await dictionaryStore.getDictionary(referencedTable, {
          idField: referencedFieldID,
          nameField: referencedFieldName,
          limit: 30,
          offset: currentOffset
        });

        // Transform to dropdown options
        const opts: DropdownOption[] = records.map(record => ({
          value: record.id,
          label: record.name
        }));

        console.log('[DropdownInput] Loaded options:', opts.length, 'hasMore:', more);

        if (append) {
          // Filter out duplicates when appending
          setDynamicOptions(prev => {
            const existingIds = new Set(prev.map(o => o.value));
            const newOptions = opts.filter(o => !existingIds.has(o.value));
            return [...prev, ...newOptions];
          });
          setOffset(currentOffset + 30);
        } else {
          setDynamicOptions(opts);
          setOffset(30);
        }

        setHasMore(more);
      } catch (error) {
        console.error(`Failed to load dictionary ${referencedTable}:`, error);
      } finally {
        setLoading(false);
      }
    }, [referencedTable, referencedFieldID, referencedFieldName, offset]);

    // Load dictionary data when dropdown opens
    useEffect(() => {
      if (isOpen && referencedTable && dynamicOptions.length === 0) {
        loadDictionaryOptions();
      }
    }, [isOpen, referencedTable, dynamicOptions.length, loadDictionaryOptions]);

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
        offset,
        referencedTable
      });

      if (!referencedTable || !hasMore || loading) {
        console.log('[DropdownInput] Scroll blocked:', { referencedTable, hasMore, loading });
        return;
      }

      // Load more when scrolled to bottom (with 50px threshold)
      if (scrollBottom < 50) {
        console.log('[DropdownInput] Scroll to bottom, loading more... offset:', offset);
        loadDictionaryOptions(true);
      }
    }, [referencedTable, hasMore, loading, offset, loadDictionaryOptions]);

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
      <div className="relative" ref={dropdownRef}>
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
              "cursor-pointer pr-10",
              className
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            {...props}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )} />
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
          error={error}
          helperText={!error ? helperText : undefined}
          required={required}
          className={fieldClassName}
        >
          {selectElement}
        </FormField>
      );
    }

    return selectElement;
  }
);

DropdownInput.displayName = "DropdownInput";