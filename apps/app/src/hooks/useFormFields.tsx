/**
 * useFormFields — shared hook for form field rendering logic.
 *
 * Unifies the common patterns across:
 * - EditFormTab (entity edit page)
 * - EditChildRecordDialog (child record modal)
 * - FiltersDialog (filter modal)
 *
 * Provides: field grouping, cascade props, junction wrapping,
 * visibility checks, and a unified renderField callback.
 */
import { useCallback, useMemo } from "react";
import { useDynamicFields, extractDbFieldName } from "@/hooks/useDynamicFields";
import { useFormFieldGrouping } from "@/components/edit/useFormFieldGrouping";
import { FORM_COMPONENT_MAP } from "@/components/edit/componentMap";
import { JunctionFilterField } from "@/components/edit/JunctionFilterField";
import type { BaseFieldConfig } from "@/types/field-config";

interface UseFormFieldsOptions {
  /** Field configs (Record or array format) */
  fields: Record<string, BaseFieldConfig> | undefined;
  /** Get current value for a field by db name */
  getValue: (dbFieldName: string) => any;
  /** Handle field value change */
  onChange: (fieldName: string, value: any) => void;
  /** Current entity data (for DynamicFormField) */
  entity?: any;
  /** Current form changes (for DynamicFormField) */
  formChanges?: Record<string, any>;
  /** Readonly conditions (from useResolveConditions) */
  readonlyConditions?: {
    conditions: Record<string, boolean>;
    messages: Record<string, string>;
  };
  /** Filter for which fields to include */
  fieldFilter?: (key: string, config: BaseFieldConfig) => boolean;
}

export function useFormFields({
  fields,
  getValue,
  onChange,
  entity,
  formChanges = {},
  readonlyConditions,
  fieldFilter,
}: UseFormFieldsOptions) {
  // Filter fields if needed (e.g., showInForm only)
  const filteredFields = useMemo(() => {
    if (!fields) return {};
    if (!fieldFilter) return fields;
    const result: Record<string, BaseFieldConfig> = {};
    for (const [key, config] of Object.entries(fields)) {
      if (fieldFilter(key, config)) {
        result[key] = config;
      }
    }
    return result;
  }, [fields, fieldFilter]);

  // Build fields array for useDynamicFields
  const fieldsList = useMemo(() => {
    return Object.entries(filteredFields).map(([id, config]) => ({ id, config }));
  }, [filteredFields]);

  // Sort fields by order and group them
  const groupedFields = useFormFieldGrouping(filteredFields);

  // Core dynamic fields logic
  const { getFieldProps, getParentFieldValue, getCascadeProps, isFieldDisabled } = useDynamicFields({
    fields: fieldsList,
    getValue,
    onChange,
    readonlyConditions,
  });

  // Junction table wrapper callback — used by DynamicFormField's wrapComponent
  const wrapWithJunction = useCallback((
    fieldId: string,
    field: BaseFieldConfig,
    Component: React.ComponentType<any>,
    fieldProps: any
  ) => {
    if (field.junctionTable && field.junctionField && field.junctionFilterField) {
      const parentFieldValue = getParentFieldValue(field);
      return (
        <div key={fieldId}>
          <JunctionFilterField
            field={field}
            Component={Component}
            parentFieldValue={parentFieldValue}
            {...fieldProps}
          />
        </div>
      );
    }
    return null;
  }, [getParentFieldValue]);

  // Visibility check for visibleWhen fields
  const shouldRenderField = useCallback((fieldId: string, field: BaseFieldConfig) => {
    if (!(field as any).visibleWhen) return true;
    const vw = (field as any).visibleWhen;
    const depDbName = extractDbFieldName(vw.field);
    const currentValue = formChanges[depDbName] ?? entity?.[depDbName];
    const allowedValues = Array.isArray(vw.value) ? vw.value : [vw.value];
    return !!currentValue && allowedValues.includes(currentValue);
  }, [formChanges, entity]);

  return {
    filteredFields,
    fieldsList,
    groupedFields,
    getFieldProps,
    getParentFieldValue,
    getCascadeProps,
    isFieldDisabled,
    wrapWithJunction,
    shouldRenderField,
    extractDbFieldName,
  };
}
