import { DynamicFormField } from "@/components/edit/DynamicFormField";
import { FormGroupLayout } from "@/components/edit/FormGroupLayout";
import { FormDialog } from "@/components/edit/FormDialog";
import { useFormFields } from "@/hooks/useFormFields";
import { spaceStore } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { withCrudToast } from "@/utils/crudToast";
import { useFormValidation } from "@/hooks/useFormValidation";
import { extractDbFieldName } from "@/hooks/useDynamicFields";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EditFieldConfig } from "@/types/field-config";

interface EditChildRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: Record<string, any> | null; // null = create mode
  fields: Record<string, EditFieldConfig>;
  tableType: string;
  parentId: string;
  entityType: string;
  label?: string;
  onSaved: () => void;
  // Entity child support (entity_child dataSource type)
  isEntityChild?: boolean;
  dataSources?: DataSourceConfig[];
  parentEntity?: Record<string, any> | null;
  readOnly?: boolean;
}

/**
 * Resolve prefill values from dataSource config.
 * Replaces "$parent.fieldName" with actual parent entity values.
 * Also sets parentField = parentId for each dataSource.
 */
function resolvePrefill(
  dataSources: DataSourceConfig[],
  parentId: string,
  parentEntity: Record<string, any> | null | undefined,
  parentSex?: string,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const ds of dataSources) {
    if (!ds.childTable?.parentField) continue;

    const parentField = ds.childTable.parentField;
    const isFatherField = parentField.includes('father');
    const isMotherField = parentField.includes('mother');

    if (parentSex) {
      if (parentSex === 'male' && isFatherField) result[parentField] = parentId;
      else if (parentSex === 'female' && isMotherField) result[parentField] = parentId;
      else if (!isFatherField && !isMotherField) result[parentField] = parentId;
    } else {
      result[parentField] = parentId;
    }

    if (ds.prefill && parentEntity) {
      const shouldApplyPrefill = !parentSex
        || (parentSex === 'male' && isFatherField)
        || (parentSex === 'female' && isMotherField)
        || (!isFatherField && !isMotherField);

      if (shouldApplyPrefill) {
        for (const [targetField, sourceExpr] of Object.entries(ds.prefill)) {
          if (typeof sourceExpr === 'string' && sourceExpr.startsWith('$parent.')) {
            const sourceField = sourceExpr.slice('$parent.'.length);
            const value = parentEntity[sourceField];
            if (value !== undefined && value !== null) result[targetField] = value;
          }
        }
      }
    }
  }

  return result;
}

export function EditChildRecordDialog({
  open,
  onOpenChange,
  record,
  fields,
  tableType,
  parentId,
  entityType,
  label = "Record",
  onSaved,
  isEntityChild,
  dataSources,
  parentEntity,
  readOnly,
}: EditChildRecordDialogProps) {
  const [formChanges, setFormChanges] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!record;

  // Reset form when dialog opens/closes or record changes
  useEffect(() => {
    if (open) setFormChanges({});
  }, [open, record]);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormChanges(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  // Value getter: formChanges → record.additional → record top-level
  const getValue = useCallback(
    (dbFieldName: string) => {
      if (formChanges[dbFieldName] !== undefined) return formChanges[dbFieldName];
      if (isEntityChild) return record?.[dbFieldName];
      return record?.additional?.[dbFieldName] ?? record?.[dbFieldName];
    },
    [formChanges, record, isEntityChild]
  );

  // Current entity for PetPickerInput context
  const currentEntity = isEditMode ? record : parentEntity;

  // Shared form fields logic (cascade, junction, visibility, grouping)
  const {
    groupedFields,
    getFieldProps: baseGetFieldProps,
    wrapWithJunction,
    shouldRenderField,
  } = useFormFields({
    fields,
    getValue,
    onChange: handleFieldChange,
    entity: currentEntity,
    formChanges,
    fieldFilter: (_key, config) => (config as EditFieldConfig).showInForm !== false && !!config.component,
    parentEntity,
  });

  // Validation
  const { errors, touched, validateAll, touchAndValidate } = useFormValidation();

  // When readOnly, override all fields as disabled
  // Otherwise, wrap with validation (error/touched + real-time validation on change)
  const getFieldProps = readOnly
    ? (fieldId: string, config: any) => ({ ...baseGetFieldProps(fieldId, config), disabled: true, disabledOnGray: true })
    : (fieldId: string, config: any) => {
        const dbName = extractDbFieldName(fieldId);
        const props = baseGetFieldProps(fieldId, config);
        const wrapHandler = (handler: any) => {
          if (!handler) return handler;
          return (value: any) => { handler(value); touchAndValidate(dbName, config, value); };
        };
        return {
          ...props,
          onValueChange: wrapHandler(props.onValueChange),
          onChange: props.onChange ? wrapHandler(props.onChange) : undefined,
          onCheckedChange: props.onCheckedChange ? wrapHandler(props.onCheckedChange) : undefined,
          error: touched[dbName] ? errors[dbName] : undefined,
          touched: touched[dbName],
        };
      };

  const hasChanges = Object.keys(formChanges).length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    // Validate all visible fields before save
    if (fields) {
      const visibleFields = Object.fromEntries(
        Object.entries(fields).filter(([, c]) => (c as EditFieldConfig).showInForm !== false)
      );
      const isValid = validateAll(
        visibleFields,
        (key) => formChanges[extractDbFieldName(key)] ?? getValue(extractDbFieldName(key)),
        extractDbFieldName
      );
      if (!isValid) return;
    }

    setIsSaving(true);

    const verb = isEditMode ? 'update' : 'create';
    const operation = async () => {
      if (isEntityChild && dataSources) {
        const entityTable = dataSources[0]?.childTable?.table || entityType;
        if (isEditMode) return spaceStore.update(entityTable, record!.id, formChanges);
        const prefillData = resolvePrefill(dataSources, parentId, parentEntity, parentEntity?.sex);
        return spaceStore.create(entityTable, { ...prefillData, ...formChanges });
      }
      if (isEditMode) return spaceStore.updateChildRecord(entityType, tableType, record!.id, formChanges);
      return spaceStore.createChildRecord(entityType, tableType, parentId, formChanges);
    };

    const recordName = formChanges.name || record?.name;
    const fullLabel = recordName ? `${label} ${recordName}` : label;

    const result = await withCrudToast(operation, { label: fullLabel, verb });
    if (result.ok) {
      onSaved();
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  const renderField = (fieldId: string, field: EditFieldConfig) => (
    <DynamicFormField
      fieldId={fieldId}
      field={field}
      entity={currentEntity}
      formChanges={formChanges}
      handleFieldChange={handleFieldChange}
      getFieldProps={getFieldProps}
      wrapComponent={wrapWithJunction}
      shouldRender={shouldRenderField}
      className="space-y-2"
    />
  );

  if (!fields) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? `Edit ${label}` : `Add ${label}`}
      onSubmit={handleSave}
      submitLabel={isSaving ? "Saving..." : "Save"}
      cancelLabel={readOnly ? "Close" : "Cancel"}
      submitDisabled={!hasChanges || isSaving}
      hideSubmit={readOnly}
    >
      <div className="space-y-4">
        {groupedFields.map((group, idx) => (
          <div key={group.label ?? idx}>
            {group.label && (
              <h3 className="flex w-full items-center text-xl leading-[26px] font-bold text-sub-header-color mb-4">
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
    </FormDialog>
  );
}
