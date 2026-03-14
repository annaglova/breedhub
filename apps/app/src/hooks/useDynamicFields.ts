import { useCallback, useMemo } from "react";

/**
 * Shared field config interface for dynamic form rendering.
 * Used by EditFormTab, EditChildRecordDialog, and FiltersDialog.
 */
export interface DynamicFieldConfig {
  displayName: string;
  component?: string;
  fieldType?: string;
  required?: boolean;
  placeholder?: string;
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  dataSource?: "dictionary" | "collection";
  options?: Array<{ value: string; label: string }>;
  // Cascade filtering
  dependsOn?: string;
  disabledUntil?: string;
  filterBy?: string;
  [key: string]: any;
}

// Components using standard onChange (e.target.value)
export const ONCHANGE_COMPONENTS = new Set([
  "TextInput", "TextareaInput", "NumberInput", "EmailInput", "PasswordInput",
]);

// Components using onCheckedChange (boolean)
export const ONCHECKED_COMPONENTS = new Set(["CheckboxInput", "SwitchInput"]);

/**
 * Extract DB field name from config field ID.
 * e.g., "pet_field_name" -> "name", "title_in_pet_field_date" -> "date"
 */
export function extractDbFieldName(fieldId: string): string {
  const match = fieldId.match(/_field_(.+)$/);
  return match ? match[1] : fieldId;
}

interface UseDynamicFieldsOptions {
  /** All fields config (Record or Array) — used for finding dependsOn targets */
  fields: Array<{ id: string; config: DynamicFieldConfig }>;
  /** Get current value for a field by its DB name */
  getValue: (dbFieldName: string) => any;
  /** Set value for a field by its DB name */
  onChange: (dbFieldName: string, value: any) => void;
}

/**
 * Shared hook for dynamic field rendering with cascade filtering support.
 *
 * Extracts common logic from FiltersDialog, EditFormTab, and EditChildRecordDialog:
 * - Cascade filtering (filterBy → filterByValue resolution)
 * - Field disabling (disabledUntil)
 * - Dependent field clearing on parent change
 * - Component props building (value, onChange, cascadeProps)
 */
export function useDynamicFields({ fields, getValue, onChange }: UseDynamicFieldsOptions) {

  /**
   * Find dependent fields that should be cleared when a field changes.
   */
  const getDependentFields = useCallback(
    (changedFieldId: string) => {
      return fields.filter(
        ({ config }) =>
          config.dependsOn === changedFieldId ||
          config.dependsOn?.endsWith(changedFieldId) ||
          config.disabledUntil === changedFieldId ||
          config.disabledUntil?.endsWith(changedFieldId)
      );
    },
    [fields]
  );

  /**
   * Handle field value change with dependent field clearing.
   */
  const handleChange = useCallback(
    (fieldId: string, dbFieldName: string, value: any) => {
      onChange(dbFieldName, value);

      // Clear dependent fields
      const dependents = getDependentFields(fieldId);
      for (const dep of dependents) {
        const depDbName = extractDbFieldName(dep.id);
        const currentVal = getValue(depDbName);
        if (currentVal !== undefined && currentVal !== "" && currentVal !== null) {
          onChange(depDbName, "");
        }
      }
    },
    [onChange, getValue, getDependentFields]
  );

  /**
   * Check if a field should be disabled based on disabledUntil.
   */
  const isFieldDisabled = useCallback(
    (config: DynamicFieldConfig): boolean => {
      if (!config.disabledUntil) return false;

      // Find the parent field
      const parentField = fields.find(
        ({ id }) =>
          id === config.disabledUntil ||
          config.disabledUntil!.endsWith(id)
      );

      const parentDbName = parentField
        ? extractDbFieldName(parentField.id)
        : extractDbFieldName(config.disabledUntil);

      const parentValue = getValue(parentDbName);
      return !parentValue || parentValue === "";
    },
    [fields, getValue]
  );

  /**
   * Resolve parent field value for cascade filtering (filterBy → filterByValue).
   */
  const getParentFieldValue = useCallback(
    (config: DynamicFieldConfig): string | undefined => {
      if (!config.dependsOn) return undefined;

      const parentField = fields.find(
        ({ id }) =>
          id === config.dependsOn ||
          config.dependsOn?.endsWith(id)
      );

      const parentDbName = parentField
        ? extractDbFieldName(parentField.id)
        : extractDbFieldName(config.dependsOn);

      return getValue(parentDbName) || undefined;
    },
    [fields, getValue]
  );

  /**
   * Build cascade filtering props for a field.
   */
  const getCascadeProps = useCallback(
    (config: DynamicFieldConfig): Record<string, any> => {
      if (!config.filterBy) return {};

      return {
        filterBy: config.filterBy,
        filterByValue: getParentFieldValue(config),
      };
    },
    [getParentFieldValue]
  );

  /**
   * Build change handler props for a component based on its type.
   */
  const getChangeProps = useCallback(
    (fieldId: string, dbFieldName: string, componentName: string) => {
      const wrappedChange = (value: any) => handleChange(fieldId, dbFieldName, value);

      if (ONCHANGE_COMPONENTS.has(componentName)) {
        return { onChange: (e: React.ChangeEvent<HTMLInputElement>) => wrappedChange(e.target.value) };
      }
      if (ONCHECKED_COMPONENTS.has(componentName)) {
        return { onCheckedChange: (checked: boolean) => wrappedChange(checked) };
      }
      return { onValueChange: wrappedChange };
    },
    [handleChange]
  );

  /**
   * Build value props for a component.
   */
  const getValueProps = useCallback(
    (dbFieldName: string, componentName: string) => {
      const value = getValue(dbFieldName);
      if (ONCHECKED_COMPONENTS.has(componentName)) {
        return { checked: value ?? false };
      }
      return { value: value ?? "" };
    },
    [getValue]
  );

  /**
   * Build all standard props for a field component.
   */
  const getFieldProps = useCallback(
    (fieldId: string, config: DynamicFieldConfig) => {
      const dbFieldName = extractDbFieldName(fieldId);
      const componentName = config.component || "";
      const disabled = isFieldDisabled(config);

      return {
        label: config.displayName,
        ...getValueProps(dbFieldName, componentName),
        ...getChangeProps(fieldId, dbFieldName, componentName),
        required: config.required,
        placeholder: config.placeholder,
        referencedTable: config.referencedTable,
        referencedFieldID: config.referencedFieldID,
        referencedFieldName: config.referencedFieldName,
        ...(config.dataSource ? { dataSource: config.dataSource } : {}),
        options: config.options || [],
        disabled,
        disabledOnGray: disabled,
        ...getCascadeProps(config),
      };
    },
    [isFieldDisabled, getValueProps, getChangeProps, getCascadeProps]
  );

  return {
    getFieldProps,
    isFieldDisabled,
    getCascadeProps,
    getParentFieldValue,
    handleChange,
    extractDbFieldName,
  };
}
