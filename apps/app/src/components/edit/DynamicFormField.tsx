/**
 * DynamicFormField - Renders a single form field by component name from config.
 *
 * Handles: component lookup, PetPickerInput special case, hidden fields.
 * Used by EditFormTab and EditChildRecordDialog.
 */
import React from "react";
import { PetPickerInput } from "@/components/edit/inputs/PetPickerInput";
import { FORM_COMPONENT_MAP } from "@/components/edit/componentMap";
import { extractDbFieldName } from "@/hooks/useDynamicFields";

interface DynamicFormFieldProps {
  fieldId: string;
  field: {
    displayName: string;
    component?: string;
    hidden?: boolean;
    required?: boolean;
    placeholder?: string;
    pairedField?: string;
    sexFilter?: "male" | "female";
    [key: string]: any;
  };
  entity: any;
  formChanges: Record<string, any>;
  handleFieldChange: (field: string, value: any) => void;
  getFieldProps: (fieldId: string, field: any) => any;
  /** Extra wrapper around rendered Component (e.g., JunctionFilterField) */
  wrapComponent?: (fieldId: string, field: any, Component: React.ComponentType<any>, fieldProps: any) => React.ReactNode | null;
  /** Return null to skip field (e.g., visibleWhen check) */
  shouldRender?: (fieldId: string, field: any) => boolean;
  className?: string;
}

export function DynamicFormField({
  fieldId,
  field,
  entity,
  formChanges,
  handleFieldChange,
  getFieldProps,
  wrapComponent,
  shouldRender,
  className,
}: DynamicFormFieldProps) {
  if (field.hidden) return null;
  if (shouldRender && !shouldRender(fieldId, field)) return null;

  const dbFieldName = extractDbFieldName(fieldId);

  // PetPickerInput: special rendering with paired field support
  if (field.component === "PetPickerInput") {
    return (
      <div key={fieldId} className={className}>
        <PetPickerInput
          label={field.displayName}
          value={formChanges[dbFieldName] ?? entity?.[dbFieldName] ?? ""}
          pairedField={field.pairedField}
          pairedValue={formChanges[field.pairedField!] ?? entity?.[field.pairedField!] ?? ""}
          sexFilter={field.sexFilter}
          handleFieldChange={handleFieldChange}
          dbFieldName={dbFieldName}
          selectedEntity={entity}
          required={field.required}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  const Component = FORM_COMPONENT_MAP[field.component!];
  if (!Component) return null;

  const fieldProps = getFieldProps(fieldId, field);

  // Optional wrapper (e.g., JunctionFilterField in EditFormTab)
  if (wrapComponent) {
    const wrapped = wrapComponent(fieldId, field, Component, fieldProps);
    if (wrapped !== null) return <>{wrapped}</>;
  }

  return (
    <div key={fieldId} className={className}>
      <Component {...fieldProps} />
    </div>
  );
}
