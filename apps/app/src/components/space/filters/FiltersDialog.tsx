import { FORM_COMPONENT_MAP } from "@/components/edit/componentMap";
import { useDynamicFields } from "@/hooks/useDynamicFields";
import { useJunctionFilterIds } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import { Label } from "@ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import React, { useCallback, useMemo } from "react";

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
  slug?: string;
  value?: any;
  validation?: any;
  order: number;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  mainFilterField?: boolean;
  // Dictionary loading props
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  dataSource?: "dictionary" | "collection";
  // Filter behavior props
  dependsOn?: string;
  disabledUntil?: string;
  filterBy?: string;
  // Junction table filtering (many-to-many)
  junctionTable?: string;
  junctionField?: string;
  junctionFilterField?: string;
  // OR fields (single filter applies to multiple DB fields with OR logic)
  orFields?: string[];
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

const componentMap = FORM_COMPONENT_MAP;

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

    const firstWord =
      words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
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
      setErrors({});
      setTouched({});
    }
  }, [open, initialValues]);

  // Build fields list for useDynamicFields
  const fieldsList = useMemo(() => {
    return filterFields.map((f) => ({ id: f.id, config: f }));
  }, [filterFields]);

  // getValue for useDynamicFields: filterValues uses field.id as key
  const getValue = useCallback(
    (fieldId: string) => filterValues[fieldId],
    [filterValues]
  );

  // Dummy onChange — FiltersDialog handles its own state via handleValueChange
  const noopOnChange = useCallback(() => {}, []);

  const { isFieldDisabled, getCascadeProps, getParentFieldValue } = useDynamicFields({
    fields: fieldsList,
    getValue,
    onChange: noopOnChange,
  });

  // Validate required fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    for (const field of filterFields) {
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

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (!validateForm()) {
      return;
    }

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
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldId];
          return newErrors;
        });
      }
    }

    // Recursively find all dependent fields (transitive cascade)
    const allDependents: FilterFieldConfig[] = [];
    const cleared = new Set<string>();
    const collectDependents = (parentId: string) => {
      const deps = filterFields.filter(
        (f) =>
          !cleared.has(f.id) && (
            f.dependsOn === parentId ||
            f.dependsOn?.endsWith(parentId) ||
            f.disabledUntil === parentId ||
            f.disabledUntil?.endsWith(parentId)
          ),
      );
      for (const dep of deps) {
        cleared.add(dep.id);
        allDependents.push(dep);
        collectDependents(dep.id);
      }
    };
    collectDependents(fieldId);

    setFilterValues((prev) => {
      const newValues = {
        ...prev,
        [fieldId]: value,
      };

      for (const depField of allDependents) {
        if (prev[depField.id] !== undefined) {
          newValues[depField.id] = "";
        }
      }

      return newValues;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-portal-dropdown]")) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
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
                const cascadeProps = getCascadeProps(field);
                const parentFieldValue = getParentFieldValue(field);

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
