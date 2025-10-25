import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import {
  CheckboxInput,
  DateInput,
  DropdownInput,
  EmailInput,
  FileInput,
  LookupInput,
  NumberInput,
  PasswordInput,
  RadioInput,
  SwitchInput,
  TextInput,
  TextareaInput,
  TimeInput,
} from "@ui/components/form-inputs";
import { Label } from "@ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import React from "react";

export interface FilterConfig {
  id: string;
  label: string;
  placeholder?: string;
  type: "select" | "text" | "date" | "dateRange" | "autocomplete";
  options?: { value: string; label: string }[];
  component?: React.ReactNode;
}

export interface FilterFieldConfig {
  id: string;
  displayName: string;
  component: string;
  placeholder?: string;
  fieldType: string;
  required?: boolean;
  operator?: string;
  slug?: string; // Short URL slug for filter (e.g., "type" instead of "breed_field_pet_type_id")
  value?: any;
  validation?: any;
  order: number;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  mainFilterField?: boolean; // If true, this field is used for main search, not shown in filter dialog
  // Dictionary loading props
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
}

interface FiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters?: FilterConfig[];
  filterFields?: FilterFieldConfig[];
  mainFilter?: FilterConfig;
  onApply?: (values: Record<string, any>) => void;
  onCancel?: () => void;
  initialValues?: Record<string, any>;
}

// Component mapping для динамічного рендерингу
const componentMap: Record<string, React.ComponentType<any>> = {
  TextInput,
  TextareaInput,
  NumberInput,
  CheckboxInput,
  DateInput,
  TimeInput,
  DropdownInput,
  LookupInput,
  EmailInput,
  PasswordInput,
  FileInput,
  RadioInput,
  SwitchInput,
};

export function FiltersDialog({
  open,
  onOpenChange,
  filters = [],
  filterFields = [],
  mainFilter,
  onApply,
  onCancel,
  initialValues = {},
}: FiltersDialogProps) {
  // Helper to convert "Pet Type" → "Pet type" (sentence case)
  const toSentenceCase = (text: string): string => {
    const words = text.split(" ");
    if (words.length === 0) return text;

    // First word keeps first letter uppercase, rest lowercase
    const firstWord =
      words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    // Other words all lowercase
    const otherWords = words.slice(1).map((w) => w.toLowerCase());

    return [firstWord, ...otherWords].join(" ");
  };

  // State for filter values - initialize with initialValues
  const [filterValues, setFilterValues] =
    React.useState<Record<string, any>>(initialValues);

  // Update filter values when initialValues change (URL changed)
  React.useEffect(() => {
    if (open) {
      setFilterValues(initialValues);
    }
  }, [open, initialValues]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if there are any changes compared to initial values
    const hasChanges = JSON.stringify(filterValues) !== JSON.stringify(initialValues);

    if (hasChanges) {
      console.log('[FiltersDialog] Filters changed, applying:', filterValues);
      // Only call onApply if there are actual changes
      onApply?.(filterValues);
    } else {
      console.log('[FiltersDialog] No changes detected, skipping apply');
    }

    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleValueChange = (fieldId: string, value: any) => {
    console.log("[FiltersDialog] Value changed:", fieldId, "=", value);
    setFilterValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select a filter</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleApply}>
          <div className="mt-2 flex flex-col rounded-lg bg-modal-card-ground px-6 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Dynamic Filter Fields from config */}
              {filterFields.map((field) => {
                const Component = componentMap[field.component];

                if (!Component) {
                  console.warn(
                    `[FiltersDialog] Unknown component: ${field.component}`
                  );
                  return null;
                }

                return (
                  <div key={field.id} className="space-y-2">
                    <Component
                      label={toSentenceCase(field.displayName)}
                      placeholder={field.placeholder}
                      required={field.required}
                      id={field.id}
                      options={field.options || []}
                      referencedTable={field.referencedTable}
                      referencedFieldID={field.referencedFieldID}
                      referencedFieldName={field.referencedFieldName}
                      value={filterValues[field.id] || ""}
                      onValueChange={(value: any) =>
                        handleValueChange(field.id, value)
                      }
                    />
                  </div>
                );
              })}

              {/* Legacy filters support (fallback) */}
              {filters.length > 0 && filterFields.length === 0 && (
                <>
                  {/* Main Filter */}
                  {mainFilter && !mainFilter.component && (
                    <div className="space-y-2">
                      <Label htmlFor={mainFilter.id}>
                        {mainFilter.placeholder || mainFilter.label}
                      </Label>
                      <Select>
                        <SelectTrigger id={mainFilter.id}>
                          <SelectValue placeholder={mainFilter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {mainFilter.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Other Filters */}
                  {filters.map((filter) => (
                    <div key={filter.id} className="space-y-2">
                      {filter.component ? (
                        // Custom component for complex filters
                        filter.component
                      ) : filter.type === "select" ? (
                        <>
                          <Label htmlFor={filter.id}>
                            {filter.placeholder || filter.label}
                          </Label>
                          <Select>
                            <SelectTrigger id={filter.id}>
                              <SelectValue placeholder={filter.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {filter.options?.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        // Placeholder for other input types
                        <div>
                          <Label htmlFor={filter.id}>{filter.label}</Label>
                          <div className="text-sm text-muted-foreground">
                            {filter.type} input - to be implemented
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="small-button bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="small-button bg-primary-50 dark:bg-primary-300 hover:bg-primary-100 focus:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-200 text-primary dark:text-zinc-900"
            >
              Apply filters
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
