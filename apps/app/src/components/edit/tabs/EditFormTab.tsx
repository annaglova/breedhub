import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useEditForm } from "@/hooks/useEditForm";
import { useSignals } from "@preact/signals-react/runtime";
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
import { useEffect, useMemo } from "react";

// Component mapping for dynamic rendering (same as FiltersDialog)
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
  'TextInput', 'TextareaInput', 'NumberInput', 'EmailInput', 'PasswordInput',
]);

// Components using onCheckedChange (boolean)
const ONCHECKED_COMPONENTS = new Set(['CheckboxInput', 'SwitchInput']);

interface FieldConfig {
  displayName: string;
  component: string;
  fieldType: string;
  sortOrder: number;
  required?: boolean;
  placeholder?: string;
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  dataSource?: "dictionary" | "collection";
  dependsOn?: string;
  disabledUntil?: string;
  filterBy?: string;
  validation?: any;
  options?: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
  group?: string;
}

interface EditFormTabProps {
  fields?: Record<string, FieldConfig>;
  onLoadedCount?: (count: number) => void;
  entityType?: string;
  onSaveReady?: (handler: () => Promise<void>) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Extract DB field name from config field ID
 * e.g., "pet_field_name" -> "name", "pet_field_breed_id" -> "breed_id"
 */
function getDbFieldName(fieldId: string): string {
  // Remove entity prefix: "pet_field_name" -> "name"
  const match = fieldId.match(/^[a-z]+_field_(.+)$/);
  return match ? match[1] : fieldId;
}

/**
 * EditFormTab - Dynamic form tab for edit page
 *
 * Reads fields from tab config and renders them using componentMap.
 * Same pattern as FiltersDialog but for entity editing.
 * Uses useEditForm hook for form state and save via spaceStore.update().
 */
export function EditFormTab({ fields, onLoadedCount, entityType, onSaveReady, onDirtyChange }: EditFormTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();

  const { formChanges, hasChanges, handleFieldChange, handleSave } = useEditForm({
    entityType: entityType || '',
    entityId: selectedEntity?.id,
  });

  // Register save handler with parent
  useEffect(() => {
    if (onSaveReady) {
      onSaveReady(handleSave);
    }
  }, [onSaveReady, handleSave]);

  // Notify parent about dirty state changes
  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  // Sort fields by sortOrder and group them
  const groupedFields = useMemo(() => {
    if (!fields) return [];

    const sorted = Object.entries(fields).sort(
      ([, a], [, b]) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );

    // Build ordered groups preserving first-seen order
    const groups: Array<{ label: string | null; fields: Array<[string, FieldConfig]> }> = [];
    const groupMap = new Map<string | null, Array<[string, FieldConfig]>>();

    for (const entry of sorted) {
      const groupKey = entry[1].group || null;
      if (!groupMap.has(groupKey)) {
        const arr: Array<[string, FieldConfig]> = [];
        groupMap.set(groupKey, arr);
        groups.push({ label: groupKey, fields: arr });
      }
      groupMap.get(groupKey)!.push(entry);
    }

    return groups;
  }, [fields]);

  // Total field count for reporting
  const totalFieldCount = useMemo(
    () => groupedFields.reduce((sum, g) => sum + g.fields.length, 0),
    [groupedFields]
  );

  // Report field count
  useEffect(() => {
    onLoadedCount?.(totalFieldCount);
  }, [totalFieldCount, onLoadedCount]);

  if (!fields || totalFieldCount === 0) {
    return (
      <div className="py-8 text-center text-secondary">
        No fields configured
      </div>
    );
  }

  /**
   * Render a single field
   */
  const renderField = (fieldId: string, field: FieldConfig) => {
    const Component = componentMap[field.component];

    if (!Component) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[EditFormTab] Unknown component: ${field.component} for field ${fieldId}`
        );
      }
      return null;
    }

    const dbFieldName = getDbFieldName(fieldId);
    const isChecked = ONCHECKED_COMPONENTS.has(field.component);

    // Change handler varies by component type
    const changeProps = ONCHANGE_COMPONENTS.has(field.component)
      ? { onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(dbFieldName, e.target.value) }
      : isChecked
        ? { onCheckedChange: (checked: boolean) => handleFieldChange(dbFieldName, checked) }
        : { onValueChange: (val: any) => handleFieldChange(dbFieldName, val) };

    // Value prop varies: checked for checkbox/switch, value for all others
    const valueProps = isChecked
      ? { checked: formChanges[dbFieldName] ?? selectedEntity?.[dbFieldName] ?? false }
      : { value: formChanges[dbFieldName] ?? selectedEntity?.[dbFieldName] ?? "" };

    return (
      <div key={fieldId} className={field.fullWidth ? "sm:col-span-2" : ""}>
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
    <div className="py-2 space-y-4">
      {groupedFields.map((group, idx) => (
        <div key={group.label ?? idx}>
          {group.label && (
            <h3 className="flex w-full items-center text-2xl leading-[30px] font-bold text-sub-header-color bg-header-ground/75 px-4 sm:px-6 py-2 mb-4 mt-4">
              {group.label}
            </h3>
          )}
          <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
            {group.fields.map(([fieldId, field]) => renderField(fieldId, field))}
          </div>
        </div>
      ))}
    </div>
  );
}
