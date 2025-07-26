import React, { forwardRef, useState, useRef, useEffect } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Search, X, Loader2 } from "lucide-react";

interface LookupOption {
  value: string;
  label: string;
  description?: string;
}

interface LookupInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  required?: boolean;
  options: LookupOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  fieldClassName?: string;
}

export const LookupInput = forwardRef<HTMLInputElement, LookupInputProps>(
  ({ 
    label, 
    error, 
    required, 
    options,
    value,
    onValueChange,
    onSearch,
    loading,
    className,
    fieldClassName,
    placeholder = "Search...",
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Find selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Filter options based on search
    const filteredOptions = options.filter(option => 
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
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option)}
                className={cn(
                  "px-3 py-2 cursor-pointer transition-colors",
                  "hover:bg-gray-100",
                  highlightedIndex === index && "bg-gray-100",
                  option.value === value && "bg-primary-50 text-primary-700"
                )}
              >
                <div className="font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-500">{option.description}</div>
                )}
              </div>
            ))}
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

    if (label || error) {
      return (
        <FormField
          label={label}
          error={error}
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