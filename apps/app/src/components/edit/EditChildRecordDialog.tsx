import { DynamicForm } from "@/components/edit/DynamicForm";
import { FormDialog } from "@/components/edit/FormDialog";
import { spaceStore, dictionaryStore } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { withCrudToast } from "@/utils/crudToast";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const validateRef = useRef<() => boolean>();

  const isEditMode = !!record;

  // Reset form when dialog opens/closes or record changes
  // In create mode, pre-fill from dataSource prefill config
  useEffect(() => {
    if (!open) return;
    if (!isEditMode && isEntityChild && dataSources && parentEntity) {
      // Resolve sex_id → code (male/female) for correct father/mother assignment
      const resolveAndPrefill = async () => {
        let sexCode: string | undefined;
        if (parentEntity.sex_id) {
          const sexRecord = await dictionaryStore.getRecordById('sex', parentEntity.sex_id);
          if (sexRecord) sexCode = sexRecord.code;
        }
        const prefill = resolvePrefill(dataSources, parentId, parentEntity, sexCode);
        setFormChanges(prefill);
      };
      resolveAndPrefill();
    } else {
      setFormChanges({});
    }
  }, [open, record, isEditMode, isEntityChild, dataSources, parentId, parentEntity]);

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

  const hasChanges = Object.keys(formChanges).length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    // Validate via DynamicForm
    if (validateRef.current && !validateRef.current()) return;

    setIsSaving(true);

    const verb = isEditMode ? 'update' : 'create';
    const operation = async () => {
      if (isEntityChild && dataSources) {
        const entityTable = dataSources[0]?.childTable?.table || entityType;
        if (isEditMode) return spaceStore.update(entityTable, record!.id, formChanges);
        // formChanges already includes prefill values from dialog open
        return spaceStore.create(entityTable, formChanges);
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
      <DynamicForm
        fields={fields}
        getValue={getValue}
        onChange={handleFieldChange}
        entity={currentEntity}
        formChanges={formChanges}
        readOnly={readOnly}
        parentEntity={parentEntity}
        fieldFilter={(_key, config) => (config as EditFieldConfig).showInForm !== false && !!config.component}
        variant="dialog"
        applyDefaults={!isEditMode}
        onValidateReady={(fn) => { validateRef.current = fn; }}
      />
    </FormDialog>
  );
}
