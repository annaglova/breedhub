import { DynamicFormField } from "@/components/edit/DynamicFormField";
import { FormGroupLayout } from "@/components/edit/FormGroupLayout";
import { useFormFieldGrouping } from "@/components/edit/useFormFieldGrouping";
import { spaceStore } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { withCrudToast } from "@/utils/crudToast";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDynamicFields, extractDbFieldName } from "@/hooks/useDynamicFields";

interface FieldConfig {
  displayName: string;
  component?: string;
  fieldType: string;
  showInForm?: boolean;
  order?: number;
  sortOrder?: number;
  required?: boolean;
  placeholder?: string;
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  dataSource?: "dictionary" | "collection";
  dependsOn?: string;
  disabledUntil?: string;
  filterBy?: string;
  options?: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
  group?: string;
  groupLayout?: "horizontal" | "vertical";
  [key: string]: any;
}

interface EditChildRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: Record<string, any> | null; // null = create mode
  fields: Record<string, FieldConfig>;
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

    // Determine which dataSource to use for parentField based on parent sex
    // e.g., male parent → father_id = parentId, female parent → mother_id = parentId
    const parentField = ds.childTable.parentField;
    const isFatherField = parentField.includes('father');
    const isMotherField = parentField.includes('mother');

    if (parentSex) {
      // Only set parentField for matching sex
      if (parentSex === 'male' && isFatherField) {
        result[parentField] = parentId;
      } else if (parentSex === 'female' && isMotherField) {
        result[parentField] = parentId;
      } else if (!isFatherField && !isMotherField) {
        // Generic parent field — always set
        result[parentField] = parentId;
      }
    } else {
      // No sex info — set first dataSource's parentField
      result[parentField] = parentId;
    }

    // Resolve prefill values from parent entity
    if (ds.prefill && parentEntity) {
      // Only apply prefill for matching sex dataSource
      const shouldApplyPrefill = !parentSex
        || (parentSex === 'male' && isFatherField)
        || (parentSex === 'female' && isMotherField)
        || (!isFatherField && !isMotherField);

      if (shouldApplyPrefill) {
        for (const [targetField, sourceExpr] of Object.entries(ds.prefill)) {
          if (typeof sourceExpr === 'string' && sourceExpr.startsWith('$parent.')) {
            const sourceField = sourceExpr.slice('$parent.'.length);
            const value = parentEntity[sourceField];
            if (value !== undefined && value !== null) {
              result[targetField] = value;
            }
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
    if (open) {
      setFormChanges({});
    }
  }, [open, record]);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormChanges(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  // Filter form fields
  const formFieldsMap = useMemo(() => {
    if (!fields) return {};
    const result: Record<string, FieldConfig> = {};
    for (const [key, config] of Object.entries(fields)) {
      if (config.showInForm !== false && config.component) {
        result[key] = config;
      }
    }
    return result;
  }, [fields]);

  // Sort fields by order and group them
  const groupedFields = useFormFieldGrouping(formFieldsMap);

  // Build fields array for useDynamicFields
  const fieldsList = useMemo(() => {
    return Object.entries(formFieldsMap).map(([id, config]) => ({ id, config }));
  }, [formFieldsMap]);

  // Value getter: formChanges → record.additional → record top-level
  const getValue = useCallback(
    (dbFieldName: string) => {
      if (formChanges[dbFieldName] !== undefined) return formChanges[dbFieldName];
      if (isEntityChild) {
        // Entity records have flat structure (no additional)
        return record?.[dbFieldName];
      }
      return record?.additional?.[dbFieldName] ?? record?.[dbFieldName];
    },
    [formChanges, record, isEntityChild]
  );

  const { getFieldProps: baseGetFieldProps } = useDynamicFields({
    fields: fieldsList,
    getValue,
    onChange: handleFieldChange,
  });

  // When readOnly, override all fields as disabled
  const getFieldProps = readOnly
    ? (fieldId: string, config: any) => ({ ...baseGetFieldProps(fieldId, config), disabled: true, disabledOnGray: true })
    : baseGetFieldProps;

  const hasChanges = Object.keys(formChanges).length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setIsSaving(true);

    const verb = isEditMode ? 'update' : 'create';
    const operation = async () => {
      if (isEntityChild && dataSources) {
        const entityTable = dataSources[0]?.childTable?.table || entityType;
        if (isEditMode) {
          return spaceStore.update(entityTable, record!.id, formChanges);
        }
        const prefillData = resolvePrefill(
          dataSources,
          parentId,
          parentEntity,
          parentEntity?.sex,
        );
        return spaceStore.create(entityTable, { ...prefillData, ...formChanges });
      }
      // Standard child record
      if (isEditMode) {
        return spaceStore.updateChildRecord(entityType, tableType, record!.id, formChanges);
      }
      return spaceStore.createChildRecord(entityType, tableType, parentId, formChanges);
    };

    // Append record name to label when available (e.g. "Pet Rex" for entity children)
    const recordName = formChanges.name || record?.name;
    const fullLabel = recordName ? `${label} ${recordName}` : label;

    const result = await withCrudToast(operation, { label: fullLabel, verb });
    if (result.ok) {
      onSaved();
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  // Current entity for PetPickerInput context (editing record or parent entity)
  const currentEntity = isEditMode ? record : parentEntity;

  const renderField = (fieldId: string, field: FieldConfig) => (
    <DynamicFormField
      fieldId={fieldId}
      field={field}
      entity={currentEntity}
      formChanges={formChanges}
      handleFieldChange={handleFieldChange}
      getFieldProps={getFieldProps}
      className="space-y-2"
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
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
          <DialogTitle>{isEditMode ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <div className="modal-card space-y-4">
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

          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="small-button bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
            <Button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="small-button bg-primary-50 dark:bg-primary-300 hover:bg-primary-100 focus:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-200 text-primary dark:text-zinc-900"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
