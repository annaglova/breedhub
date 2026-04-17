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
  /** Parent entity for dependsOnParent junction filtering (child dialogs) */
  parentEntity?: Record<string, any> | null;
}

export function useFormFields({
  fields,
  getValue,
  onChange,
  entity,
  formChanges = {},
  readonlyConditions,
  fieldFilter,
  parentEntity,
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
    parentEntity,
  });

  // Junction table wrapper callback — used by DynamicFormField's wrapComponent
  const wrapWithJunction = useCallback((
    fieldId: string,
    field: BaseFieldConfig,
    Component: React.ComponentType<any>,
    fieldProps: any
  ) => {
    const hasDependsOnParent = field.dependsOnParent && parentEntity;
    const hasStandardJunction = field.junctionTable && field.junctionField && field.junctionFilterField;

    if (!field.junctionTable || !field.junctionField || (!hasStandardJunction && !hasDependsOnParent)) {
      return null;
    }

    // dependsOnParent: resolve all filter pairs from parent entity
    if (hasDependsOnParent) {
      const entries = Object.entries(field.dependsOnParent as Record<string, string>);
      const firstEntry = entries[0];
      if (!firstEntry) {
        return null;
      }
      const primaryFilterField = firstEntry[0];
      const primaryValue = parentEntity![firstEntry[1]];
      const additional = entries.slice(1).map(([junctionCol, parentField]) => ({
        field: junctionCol,
        value: parentEntity![parentField],
      }));

      return (
        <div key={fieldId}>
          <JunctionFilterField
            field={{ ...field, junctionFilterField: primaryFilterField }}
            Component={Component}
            parentFieldValue={primaryValue}
            additionalFilters={additional.length > 0 ? additional : undefined}
            {...fieldProps}
          />
        </div>
      );
    }

    // Standard: single filter from same form (coat_color pattern)
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
  }, [getParentFieldValue, parentEntity]);

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
