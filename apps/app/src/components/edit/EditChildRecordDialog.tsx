import { spaceStore, toast } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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

// Component mapping (same as EditFormTab)
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

// Components using standard onChange (e.target.value)
const ONCHANGE_COMPONENTS = new Set([
  "TextInput", "TextareaInput", "NumberInput", "EmailInput", "PasswordInput",
]);

// Components using onCheckedChange (boolean)
const ONCHECKED_COMPONENTS = new Set(["CheckboxInput", "SwitchInput"]);

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
}

/** Extract field name from config key: "title_in_pet_field_date" → "date" */
function extractFieldName(configKey: string): string {
  const match = configKey.match(/_field_(.+)$/);
  return match ? match[1] : configKey;
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

  // Group fields (same logic as EditFormTab)
  const groupedFields = useMemo(() => {
    const groups: Array<{
      label: string | null;
      layout: "horizontal" | "vertical";
      fields: Array<[string, FieldConfig]>;
    }> = [];
    const groupMap = new Map<string | null, {
      layout: "horizontal" | "vertical";
      fields: Array<[string, FieldConfig]>;
    }>();

    for (const entry of formFields) {
      const groupKey = entry[1].group || null;
      if (!groupMap.has(groupKey)) {
        const group = {
          layout: (entry[1].groupLayout || "vertical") as "horizontal" | "vertical",
          fields: [] as Array<[string, FieldConfig]>,
        };
        groupMap.set(groupKey, group);
        groups.push({ label: groupKey, ...group });
      }
      groupMap.get(groupKey)!.fields.push(entry);
    }

    return groups;
  }, [formFields]);

  const hasChanges = Object.keys(formChanges).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      if (isEditMode) {
        await spaceStore.updateChildRecord(entityType, tableType, record!.id, formChanges);
        toast.success(`${label} updated`);
      } else {
        await spaceStore.createChildRecord(entityType, tableType, parentId, formChanges);
        toast.success(`${label} created`);
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
    const Component = componentMap[field.component];
    if (!Component) return null;

    const fieldName = extractFieldName(fieldId);
    const isChecked = ONCHECKED_COMPONENTS.has(field.component);

    // Get current value: form changes → record additional → record top-level → default
    const recordValue = record?.additional?.[fieldName] ?? record?.[fieldName];
    const currentValue = formChanges[fieldName] ?? recordValue;

    const changeProps = ONCHANGE_COMPONENTS.has(field.component)
      ? { onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(fieldName, e.target.value) }
      : isChecked
        ? { onCheckedChange: (checked: boolean) => handleFieldChange(fieldName, checked) }
        : { onValueChange: (val: any) => handleFieldChange(fieldName, val) };

    const valueProps = isChecked
      ? { checked: currentValue ?? false }
      : { value: currentValue ?? "" };

    return (
      <div key={fieldId}>
        <Component
          label={field.displayName}
          {...valueProps}
          {...changeProps}
          required={field.required}
          placeholder={field.placeholder}
          referencedTable={field.referencedTable}
          referencedFieldID={field.referencedFieldID}
          referencedFieldName={field.referencedFieldName}
          {...(field.dataSource ? { dataSource: field.dataSource } : {})}
          options={field.options || []}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
          {groupedFields.map((group, idx) => (
            <div key={group.label ?? idx}>
              {group.label && (
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-2">
                  {group.label}
                </h3>
              )}
              {(() => {
                const fullWidthFields = group.fields.filter(([, f]) => f.fullWidth);
                const regularFields = group.fields.filter(([, f]) => !f.fullWidth);

                if (regularFields.length === 0) {
                  return fullWidthFields.map(([fieldId, field]) => renderField(fieldId, field));
                }

                if (group.layout === "horizontal") {
                  return (
                    <>
                      {fullWidthFields.map(([fieldId, field]) => renderField(fieldId, field))}
                      <div className="sm:grid sm:grid-cols-2 sm:gap-x-3 gap-y-1">
                        {regularFields.map(([fieldId, field]) => renderField(fieldId, field))}
                      </div>
                    </>
                  );
                }

                const mid = Math.ceil(regularFields.length / 2);
                const leftCol = regularFields.slice(0, mid);
                const rightCol = regularFields.slice(mid);

                return (
                  <>
                    {fullWidthFields.map(([fieldId, field]) => renderField(fieldId, field))}
                    <div className="sm:grid sm:grid-cols-2 sm:gap-x-3">
                      <div className="space-y-1">
                        {leftCol.map(([fieldId, field]) => renderField(fieldId, field))}
                      </div>
                      <div className="space-y-1">
                        {rightCol.map(([fieldId, field]) => renderField(fieldId, field))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
