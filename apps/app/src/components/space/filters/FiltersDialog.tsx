import { FORM_COMPONENT_MAP } from "@/components/edit/componentMap";
import { JunctionFilterField } from "@/components/edit/JunctionFilterField";
import { FormDialog } from "@/components/edit/FormDialog";
import { useFormFields } from "@/hooks/useFormFields";
import React, { useCallback, useMemo } from "react";
import type { FilterFieldConfig } from "@/types/field-config";

export type { FilterFieldConfig };

export interface FilterConfig {
  id: string;
  label: string;
  placeholder?: string;
  type: "select" | "text" | "date" | "dateRange" | "autocomplete";
  options?: { value: string; label: string }[];
  component?: React.ReactNode;
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

/** Sentence case: "Pet Type" → "Pet type" */
function toSentenceCase(text: string): string {
  const words = text.split(" ");
  if (words.length === 0) return text;
  const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  const otherWords = words.slice(1).map((w) => w.toLowerCase());
  return [firstWord, ...otherWords].join(" ");
}

export function FiltersDialog({
  open,
  onOpenChange,
  filterFields = [],
  onApply,
  onCancel,
  initialValues = {},
}: FiltersDialogProps) {
  // State for filter values
  const [filterValues, setFilterValues] = React.useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setFilterValues(initialValues);
      setErrors({});
      setTouched({});
    }
  }, [open, initialValues]);

  // Build fields record for useFormFields (FilterFieldConfig uses id as key)
  const fieldsRecord = useMemo(() => {
    const result: Record<string, FilterFieldConfig> = {};
    for (const f of filterFields) {
      result[f.id] = f;
    }
    return result;
  }, [filterFields]);

  const getValue = useCallback(
    (fieldId: string) => filterValues[fieldId],
    [filterValues]
  );

  const handleValueChange = useCallback((fieldId: string, value: any) => {
    if (!touched[fieldId]) {
      setTouched(prev => ({ ...prev, [fieldId]: true }));
    }

    // Real-time validation
    const fieldConfig = filterFields.find(f => f.id === fieldId);
    if (fieldConfig?.required) {
      if (!value || value === "") {
        setErrors(prev => ({ ...prev, [fieldId]: `${toSentenceCase(fieldConfig.displayName)} is required` }));
      } else {
        setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
      }
    }

    // Cascade: clear dependent fields recursively
    const cleared = new Set<string>();
    const collectDependents = (parentId: string) => {
      const deps = filterFields.filter(f =>
        !cleared.has(f.id) && (
          f.dependsOn === parentId || f.dependsOn?.endsWith(parentId) ||
          f.disabledUntil === parentId || f.disabledUntil?.endsWith(parentId)
        )
      );
      for (const dep of deps) {
        cleared.add(dep.id);
        collectDependents(dep.id);
      }
    };
    collectDependents(fieldId);

    setFilterValues(prev => {
      const newValues = { ...prev, [fieldId]: value };
      for (const depId of cleared) {
        if (prev[depId] !== undefined) newValues[depId] = "";
      }
      return newValues;
    });
  }, [filterFields, touched]);

  // Shared form fields logic
  const { getCascadeProps, getParentFieldValue, isFieldDisabled } = useFormFields({
    fields: fieldsRecord,
    getValue,
    onChange: handleValueChange,
  });

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    for (const field of filterFields) {
      newTouched[field.id] = true;
      if (field.required) {
        const value = filterValues[field.id];
        if (!value || value === "") {
          newErrors[field.id] = `${toSentenceCase(field.displayName)} is required`;
        }
      }
    }
    setTouched(prev => ({ ...prev, ...newTouched }));
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (!validateForm()) return;

    const hasChanges = JSON.stringify(filterValues) !== JSON.stringify(initialValues);
    if (hasChanges) onApply?.(filterValues);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Select a filter"
      onSubmit={handleApply}
      onCancel={onCancel}
      submitLabel="Apply filters"
    >
      <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
        {filterFields.map((field) => {
          const Component = componentMap[field.component!];
          if (!Component) return null;

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
            onValueChange: (value: any) => handleValueChange(field.id, value),
            disabled,
            disabledOnGray: disabled,
            error: errors[field.id],
            touched: touched[field.id],
            ...cascadeProps,
          };

          if (field.junctionTable && field.junctionField && field.junctionFilterField) {
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
      </div>
    </FormDialog>
  );
}
