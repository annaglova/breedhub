/**
 * DynamicForm — shared form rendering with validation.
 *
 * Unifies the common form logic from:
 * - EditFormTab (entity edit page)
 * - EditChildRecordDialog (child record modal)
 *
 * Handles: field grouping, cascade filtering, junction wrapping,
 * visibility checks, validation (pattern/required), error display.
 */
import { DynamicFormField } from "@/components/edit/DynamicFormField";
import { FormGroupLayout } from "@/components/edit/FormGroupLayout";
import { useFormFields } from "@/hooks/useFormFields";
import { useFormValidation } from "@/hooks/useFormValidation";
import { extractDbFieldName } from "@/hooks/useDynamicFields";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { EditFieldConfig } from "@/types/field-config";

interface DynamicFormProps {
  fields?: Record<string, EditFieldConfig>;
  getValue: (dbFieldName: string) => any;
  onChange: (fieldName: string, value: any) => void;
  entity?: any;
  formChanges?: Record<string, any>;
  readOnly?: boolean;
  parentEntity?: Record<string, any> | null;
  readonlyConditions?: {
    conditions: Record<string, boolean>;
    messages: Record<string, string>;
  };
  fieldFilter?: (key: string, config: any) => boolean;
  /** "page" = full headers with bg, "dialog" = compact headers */
  variant?: "page" | "dialog";
  /** Callback to expose validate function to parent */
  onValidateReady?: (validateFn: () => boolean) => void;
  /** Apply defaultValue from field configs (create mode) */
  applyDefaults?: boolean;
}

export function DynamicForm({
  fields,
  getValue,
  onChange,
  entity,
  formChanges = {},
  readOnly,
  parentEntity,
  readonlyConditions,
  fieldFilter,
  variant = "dialog",
  onValidateReady,
  applyDefaults,
}: DynamicFormProps) {
  // Shared form fields logic
  const {
    groupedFields,
    getFieldProps: baseGetFieldProps,
    wrapWithJunction,
    shouldRenderField,
  } = useFormFields({
    fields,
    getValue,
    onChange,
    entity,
    formChanges,
    readonlyConditions,
    fieldFilter,
    parentEntity,
  });

  // Apply defaultValue for fields not yet filled (create mode, idempotent)
  useEffect(() => {
    if (!applyDefaults || !fields) return;
    for (const [fieldId, config] of Object.entries(fields)) {
      if (config.defaultValue && config.defaultValue !== '0' && config.defaultValue !== '') {
        const dbName = extractDbFieldName(fieldId);
        if (formChanges[dbName] === undefined || formChanges[dbName] === null || formChanges[dbName] === '') {
          onChange(dbName, config.defaultValue);
        }
      }
    }
  }, [applyDefaults, fields, formChanges, onChange]);

  // Validation
  const { errors, touched, validateAll, touchAndValidate } = useFormValidation();

  // Wrap getFieldProps with validation or readOnly
  const getFieldProps = useCallback((fieldId: string, config: EditFieldConfig) => {
    const props = baseGetFieldProps(fieldId, config);

    if (readOnly) {
      return { ...props, disabled: true, disabledOnGray: true };
    }

    const dbName = extractDbFieldName(fieldId);
    const wrapHandler = (handler: any) => {
      if (!handler) return handler;
      return (value: any) => {
        handler(value);
        touchAndValidate(dbName, config, value);
      };
    };

    return {
      ...props,
      onValueChange: wrapHandler(props.onValueChange),
      onChange: props.onChange ? wrapHandler(props.onChange) : undefined,
      onCheckedChange: props.onCheckedChange ? wrapHandler(props.onCheckedChange) : undefined,
      error: touched[dbName] ? errors[dbName] : undefined,
      touched: touched[dbName],
    };
  }, [baseGetFieldProps, readOnly, errors, touched, touchAndValidate]);

  // Expose validate function to parent
  const validateFn = useCallback(() => {
    if (!fields) return false;
    const visibleFields = Object.fromEntries(
      Object.entries(fields).filter(([, c]) => !c.hidden && c.showInForm !== false)
    );
    return validateAll(
      visibleFields,
      (key) => formChanges[extractDbFieldName(key)] ?? getValue(extractDbFieldName(key)),
      extractDbFieldName,
    );
  }, [fields, formChanges, getValue, validateAll]);

  useEffect(() => {
    onValidateReady?.(validateFn);
  }, [onValidateReady, validateFn]);

  // Render field
  const renderField = useCallback((fieldId: string, field: EditFieldConfig) => (
    <DynamicFormField
      fieldId={fieldId}
      field={field}
      entity={entity}
      formChanges={formChanges}
      handleFieldChange={onChange}
      getFieldProps={getFieldProps}
      shouldRender={shouldRenderField}
      wrapComponent={wrapWithJunction}
      className={variant === "dialog" ? "space-y-2" : undefined}
    />
  ), [entity, formChanges, onChange, getFieldProps, shouldRenderField, wrapWithJunction, variant]);

  // Total field count
  const totalFieldCount = useMemo(
    () => groupedFields.reduce((sum, g) => sum + g.fields.length, 0),
    [groupedFields],
  );

  if (!fields || totalFieldCount === 0) {
    return (
      <div className="py-8 text-center text-secondary">
        No fields configured
      </div>
    );
  }

  const groupLabelClass = variant === "page"
    ? "flex w-full items-center text-2xl leading-[30px] font-bold text-sub-header-color bg-header-ground/75 px-4 sm:px-6 py-2 mb-4 mt-4"
    : "flex w-full items-center text-xl leading-[26px] font-bold text-sub-header-color mb-4";

  return (
    <div className="space-y-4">
      {groupedFields.map((group, idx) => (
        <div key={group.label ?? idx}>
          {group.label && (
            <h3 className={groupLabelClass}>
              {group.label}
            </h3>
          )}
          <FormGroupLayout
            layout={group.layout}
            fields={group.fields}
            renderField={renderField}
          />
        </div>
      ))}
    </div>
  );
}
