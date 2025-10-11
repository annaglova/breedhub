import React, { forwardRef, useState, useRef, useEffect } from "react";
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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Use dynamic options if referencedTable is provided, otherwise use static options
    const activeOptions = referencedTable ? dynamicOptions : options;

    // Find selected option
    const selectedOption = activeOptions?.find(opt => opt.value === value);

    // Load dictionary data when dropdown opens
    useEffect(() => {
      if (isOpen && referencedTable && dynamicOptions.length === 0) {
        loadDictionaryOptions();
      }
    }, [isOpen, referencedTable]);

    const loadDictionaryOptions = async () => {
      if (!referencedTable) return;

      setLoading(true);

      try {
        const { records } = await dictionaryStore.getDictionary(referencedTable, {
          idField: referencedFieldID,
          nameField: referencedFieldName,
          limit: 30,
          offset: 0
        });

        // Transform to dropdown options
        const opts: DropdownOption[] = records.map(record => ({
          value: record.id,
          label: record.name
        }));

        setDynamicOptions(opts);
      } catch (error) {
        console.error(`Failed to load dictionary ${referencedTable}:`, error);
      } finally {
        setLoading(false);
      }
    };

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
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-[40vh] overflow-auto">
            {loading ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                Loading...
              </div>
            ) : !activeOptions || activeOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                No options available
              </div>
            ) : (
              activeOptions.map((option) => (
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
              ))
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