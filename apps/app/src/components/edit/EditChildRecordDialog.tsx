import { spaceStore, toast } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import {
  CheckboxInput,
  DateInput,
  DateRangeInput,
  DropdownInput,
  EmailInput,
  FileInput,
  LookupInput,
  NumberInput,
  PasswordInput,
  RadioInput,
  SwitchInput,
  TextInput,
  TextareaInput,
  TimeInput,
} from "@ui/components/form-inputs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDynamicFields, extractDbFieldName } from "@/hooks/useDynamicFields";

// Component mapping (same as EditFormTab / FiltersDialog)
const componentMap: Record<string, React.ComponentType<any>> = {
  TextInput,
  TextareaInput,
  NumberInput,
  CheckboxInput,
  DateInput,
  DateRangeInput,
  TimeInput,
  DropdownInput,
  LookupInput,
  EmailInput,
  PasswordInput,
  FileInput,
  RadioInput,
  SwitchInput,
};

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

  // Filter and sort form fields
  const formFields = useMemo(() => {
    if (!fields) return [];
    return Object.entries(fields)
      .filter(([, config]) => config.showInForm !== false && config.component)
      .sort((a, b) => (a[1].order ?? a[1].sortOrder ?? 0) - (b[1].order ?? b[1].sortOrder ?? 0));
  }, [fields]);

  // Build fields array for useDynamicFields
  const fieldsList = useMemo(() => {
    return formFields.map(([id, config]) => ({ id, config }));
  }, [formFields]);

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

  const { getFieldProps } = useDynamicFields({
    fields: fieldsList,
    getValue,
    onChange: handleFieldChange,
  });

  const hasChanges = Object.keys(formChanges).length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      if (isEntityChild && dataSources) {
        // Entity child: create/update entity record
        const entityTable = dataSources[0]?.childTable?.table || entityType;

        if (isEditMode) {
          await spaceStore.update(entityTable, record!.id, formChanges);
          toast.success(`${label} updated`);
        } else {
          // Resolve prefill: parentField + $parent.field values
          const prefillData = resolvePrefill(
            dataSources,
            parentId,
            parentEntity,
            parentEntity?.sex,
          );
          const createData = { ...prefillData, ...formChanges };
          await spaceStore.create(entityTable, createData);
          toast.success(`${label} created`);
        }
      } else {
        // Standard child record
        if (isEditMode) {
          await spaceStore.updateChildRecord(entityType, tableType, record!.id, formChanges);
          toast.success(`${label} updated`);
        } else {
          await spaceStore.createChildRecord(entityType, tableType, parentId, formChanges);
          toast.success(`${label} created`);
        }
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || `Failed to save ${label}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (fieldId: string, field: FieldConfig) => {
    const Component = componentMap[field.component!];
    if (!Component) return null;

    const fieldProps = getFieldProps(fieldId, field);

    return (
      <div key={fieldId} className="space-y-2">
        <Component {...fieldProps} />
      </div>
    );
  };

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
          <div className="modal-card">
            <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
              {formFields.map(([fieldId, field]) => renderField(fieldId, field))}
            </div>
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="small-button bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="small-button bg-primary-50 dark:bg-primary-300 hover:bg-primary-100 focus:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-200 text-primary dark:text-zinc-900"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
