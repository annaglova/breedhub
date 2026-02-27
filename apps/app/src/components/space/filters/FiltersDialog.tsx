import { useJunctionFilterIds } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import {
  CheckboxInput,
  DateInput,
  DateRangeInput,
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
  dataSource?: "dictionary" | "collection"; // How to load options: dictionary (default) or collection (for cascade filtering)
  // Filter behavior props
  dependsOn?: string; // Field ID that this field depends on (cascade filter)
  disabledUntil?: string; // Field ID - this field is disabled until that field has a value
  filterBy?: string; // Field name in referenced table to filter options by dependsOn value
  // Junction table filtering (many-to-many)
  junctionTable?: string; // Junction table name (e.g., 'coat_type_in_breed')
  junctionField?: string; // Target field to extract IDs (e.g., 'coat_type_id')
  junctionFilterField?: string; // Filter field in junction table (e.g., 'breed_id')
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
  DateRangeInput,
  TimeInput,
  DropdownInput,
  LookupInput,
  EmailInput,
  PasswordInput,
  FileInput,
  RadioInput,
  SwitchInput,
};

/**
 * Wrapper component for filter fields that use junction table filtering.
 * Needed because React hooks can't be called in a loop.
 */
function JunctionFilterField({
  field,
  Component,
  parentFieldValue,
  ...componentProps
}: {
  field: FilterFieldConfig;
  Component: React.ComponentType<any>;
  parentFieldValue?: string;
  [key: string]: any;
}) {
  const { filterByIds, junctionFilter } = useJunctionFilterIds({
    junctionTable: field.junctionTable!,
    junctionField: field.junctionField!,
    junctionFilterField: field.junctionFilterField!,
    filterValue: parentFieldValue,
  });

  return (
    <Component
      {...componentProps}
      filterByIds={filterByIds}
      junctionFilter={junctionFilter}
    />
  );
}

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

  // State for validation errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // State for touched fields (user interacted with field)
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // Update filter values when initialValues change (URL changed)
  React.useEffect(() => {
    if (open) {
      setFilterValues(initialValues);
      setErrors({}); // Clear errors when dialog opens
      setTouched({}); // Clear touched state
    }
  }, [open, initialValues]);

  // Validate required fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    for (const field of filterFields) {
      // Mark all fields as touched on submit
      newTouched[field.id] = true;

      if (field.required) {
        const value = filterValues[field.id];
        if (!value || value === "") {
          newErrors[field.id] =
            `${toSentenceCase(field.displayName)} is required`;
        }
      }
    }

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    // Remove focus from submit button after click
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Validate required fields
    if (!validateForm()) {
      return;
    }

    // Check if there are any changes compared to initial values
    const hasChanges =
      JSON.stringify(filterValues) !== JSON.stringify(initialValues);

    if (hasChanges) {
      onApply?.(filterValues);
    }

    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleValueChange = (fieldId: string, value: any) => {
    // Mark field as touched
    if (!touched[fieldId]) {
      setTouched((prev) => ({ ...prev, [fieldId]: true }));
    }

    // Find field config for validation
    const fieldConfig = filterFields.find((f) => f.id === fieldId);

    // Validate field in real-time
    if (fieldConfig?.required) {
      if (!value || value === "") {
        setErrors((prev) => ({
          ...prev,
          [fieldId]: `${toSentenceCase(fieldConfig.displayName)} is required`,
        }));
      } else {
        // Clear error if value is valid
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldId];
          return newErrors;
        });
      }
    }

    // Find fields that depend on this field and clear their values
    // dependsOn/disabledUntil can be full ID (pet_field_pet_type_id) or short ID (pet_type_id)
    const dependentFields = filterFields.filter(
      (f) =>
        f.dependsOn === fieldId ||
        f.dependsOn?.endsWith(fieldId) ||
        f.disabledUntil === fieldId ||
        f.disabledUntil?.endsWith(fieldId),
    );

    setFilterValues((prev) => {
      const newValues = {
        ...prev,
        [fieldId]: value,
      };

      // Clear dependent field values when parent field changes
      for (const depField of dependentFields) {
        if (prev[depField.id] !== undefined) {
          newValues[depField.id] = "";
        }
      }

      return newValues;
    });
  };

  // Check if a field should be disabled based on disabledUntil
  const isFieldDisabled = (field: FilterFieldConfig): boolean => {
    if (!field.disabledUntil) return false;

    // Find the field that this depends on
    // disabledUntil can be full ID (pet_field_pet_type_id) or short ID (pet_type_id)
    // filterFields use short IDs (pet_type_id), filterValues also use short IDs
    const dependsOnField = filterFields.find(
      (f) =>
        f.id === field.disabledUntil || // Exact match (short ID)
        field.disabledUntil.endsWith(f.id), // Full ID ends with short ID (pet_field_pet_type_id ends with pet_type_id)
    );

    // Get value by the actual field ID used in filterValues
    const dependsOnKey = dependsOnField?.id || field.disabledUntil;
    const dependsOnValue = filterValues[dependsOnKey];
    return !dependsOnValue || dependsOnValue === "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          // Prevent dialog from closing when clicking on portal dropdowns
          const target = e.target as HTMLElement;
          if (target.closest("[data-portal-dropdown]")) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          // Allow focus to move to portal dropdown inputs (e.g. DateRangeInput)
          const target = e.target as HTMLElement;
          if (target.closest("[data-portal-dropdown]")) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Select a filter</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleApply}>
          <div className="modal-card">
            <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
              {filterFields.map((field) => {
                const Component = componentMap[field.component];

                if (!Component) {
                  console.warn(
                    `[FiltersDialog] Unknown component: ${field.component}`,
                  );
                  return null;
                }

                const disabled = isFieldDisabled(field);

                // Get parent field value for filterBy (cascade filtering) - only for LookupInput
                // dependsOn can be full ID (pet_field_pet_type_id) or short ID (pet_type_id)
                // filterValues uses short IDs, so we need to find the matching field
                let parentFieldValue: string | undefined;
                if (field.dependsOn) {
                  const parentField = filterFields.find(
                    (f) =>
                      f.id === field.dependsOn || // Exact match
                      field.dependsOn?.endsWith(f.id), // Full ID ends with short ID
                  );
                  const parentKey = parentField?.id || field.dependsOn;
                  parentFieldValue = filterValues[parentKey];
                }

                // Pass filterBy/filterByValue for cascade filtering (DropdownInput + LookupInput)
                const cascadeProps = field.filterBy
                  ? {
                      filterBy: field.filterBy,
                      filterByValue: parentFieldValue,
                    }
                  : {};

                // Common props shared by both regular and junction filter fields
                const commonProps = {
                  label: toSentenceCase(field.displayName),
                  placeholder: field.placeholder,
                  required: field.required,
                  id: field.id,
                  options: field.options || [],
                  referencedTable: field.referencedTable,
                  referencedFieldID: field.referencedFieldID,
                  referencedFieldName: field.referencedFieldName,
                  ...(field.dataSource ? { dataSource: field.dataSource } : {}),
                  value: filterValues[field.id] || "",
                  onValueChange: (value: any) =>
                    handleValueChange(field.id, value),
                  disabled,
                  disabledOnGray: disabled,
                  error: errors[field.id],
                  touched: touched[field.id],
                  ...cascadeProps,
                };

                // Use JunctionFilterField wrapper for fields with junction table config
                if (
                  field.junctionTable &&
                  field.junctionField &&
                  field.junctionFilterField
                ) {
                  return (
                    <div key={field.id} className="space-y-2">
                      <JunctionFilterField
                        field={field}
                        Component={Component}
                        parentFieldValue={parentFieldValue}
                        {...commonProps}
                      />
                    </div>
                  );
                }

                return (
                  <div key={field.id} className="space-y-2">
                    <Component {...commonProps} />
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

          <div className="modal-actions">
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
