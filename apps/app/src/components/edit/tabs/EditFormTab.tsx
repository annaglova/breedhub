import { PetPickerInput } from "@/components/edit/inputs/PetPickerInput";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useDynamicFields, extractDbFieldName } from "@/hooks/useDynamicFields";
import { useEditForm } from "@/hooks/useEditForm";
import { useResolveConditions } from "@/hooks/useResolveConditions";
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
import { useCallback, useEffect, useMemo } from "react";

// Component mapping for dynamic rendering
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
  PetPickerInput: PetPickerInput as any,
};

interface FieldConfig {
  displayName: string;
  component: string;
  fieldType: string;
  order: number;
  required?: boolean;
  placeholder?: string;
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  dataSource?: "dictionary" | "collection";
  dependsOn?: string;
  disabledUntil?: string;
  filterBy?: string;
  readonlyWhen?: string;
  validation?: any;
  options?: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
  group?: string;
  groupLayout?: "horizontal" | "vertical";
  pairedField?: string;
  sexFilter?: "male" | "female";
  hidden?: boolean;
}

interface EditFormTabProps {
  fields?: Record<string, FieldConfig>;
  onLoadedCount?: (count: number) => void;
  entityType?: string;
  onSaveReady?: (handler: () => Promise<void>) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * EditFormTab - Dynamic form tab for edit page
 *
 * Reads fields from tab config and renders them using componentMap.
 * Uses useDynamicFields hook for cascade filtering and field props.
 * Uses useEditForm hook for form state and save via spaceStore.update().
 */
export function EditFormTab({ fields, onLoadedCount, entityType, onSaveReady, onDirtyChange }: EditFormTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();

  const { formChanges, hasChanges, handleFieldChange, handleSave } = useEditForm({
    entityType: entityType || '',
    entityId: selectedEntity?.id,
  });

  // Build fields array for useDynamicFields
  const fieldsList = useMemo(() => {
    if (!fields) return [];
    return Object.entries(fields).map(([id, config]) => ({ id, config }));
  }, [fields]);

  // Collect unique readonlyWhen condition names from field configs
  const conditionNames = useMemo(() => {
    if (!fields) return undefined;
    const names = new Set<string>();
    for (const config of Object.values(fields)) {
      if (config.readonlyWhen) names.add(config.readonlyWhen);
    }
    return names.size > 0 ? Array.from(names) : undefined;
  }, [fields]);

  // Resolve readonlyWhen conditions
  const { conditions, messages } = useResolveConditions(
    entityType || '',
    selectedEntity,
    conditionNames,
  );

  // Value getter: formChanges → selectedEntity
  const getValue = useCallback(
    (dbFieldName: string) => formChanges[dbFieldName] ?? selectedEntity?.[dbFieldName],
    [formChanges, selectedEntity]
  );

  const { getFieldProps } = useDynamicFields({
    fields: fieldsList,
    getValue,
    onChange: handleFieldChange,
    readonlyConditions: conditionNames ? { conditions, messages } : undefined,
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

  // Sort fields by order and group them
  const groupedFields = useMemo(() => {
    if (!fields) return [];

    const sorted = Object.entries(fields).sort(
      ([, a], [, b]) => (a.order || 0) - (b.order || 0)
    );

    // Build ordered groups preserving first-seen order
    // groupLayout is taken from the first field in the group that has it set
    const groups: Array<{ label: string | null; layout: "horizontal" | "vertical"; fields: Array<[string, FieldConfig]> }> = [];
    const groupMap = new Map<string | null, { layout: "horizontal" | "vertical"; fields: Array<[string, FieldConfig]> }>();

    for (const entry of sorted) {
      const groupKey = entry[1].group || null;
      if (!groupMap.has(groupKey)) {
        const group = { layout: (entry[1].groupLayout || "vertical") as "horizontal" | "vertical", fields: [] as Array<[string, FieldConfig]> };
        groupMap.set(groupKey, group);
        groups.push({ label: groupKey, ...group });
      }
      groupMap.get(groupKey)!.fields.push(entry);
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
    if (field.hidden) return null;

    const dbFieldName = extractDbFieldName(fieldId);

    // PetPickerInput: special rendering with paired field support
    if (field.component === "PetPickerInput") {
      return (
        <div key={fieldId}>
          <PetPickerInput
            label={field.displayName}
            value={formChanges[dbFieldName] ?? selectedEntity?.[dbFieldName] ?? ""}
            pairedField={field.pairedField}
            pairedValue={formChanges[field.pairedField!] ?? selectedEntity?.[field.pairedField!] ?? ""}
            sexFilter={field.sexFilter}
            handleFieldChange={handleFieldChange}
            dbFieldName={dbFieldName}
            selectedEntity={selectedEntity}
            required={field.required}
            placeholder={field.placeholder}
          />
        </div>
      );
    }

    const Component = componentMap[field.component];

    if (!Component) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[EditFormTab] Unknown component: ${field.component} for field ${fieldId}`
        );
      }
      return null;
    }

    const fieldProps = getFieldProps(fieldId, field);

    return (
      <div key={fieldId}>
        <Component {...fieldProps} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {groupedFields.map((group, idx) => (
        <div key={group.label ?? idx}>
          {group.label && (
            <h3 className="flex w-full items-center text-2xl leading-[30px] font-bold text-sub-header-color bg-header-ground/75 px-4 sm:px-6 py-2 mb-4 mt-4">
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
              // Horizontal: row-by-row (1|2, 3|4, 5|6)
              return (
                <>
                  {fullWidthFields.map(([fieldId, field]) => renderField(fieldId, field))}
                  <div className="sm:grid sm:grid-cols-2 sm:gap-x-3 gap-y-1">
                    {regularFields.map(([fieldId, field]) => renderField(fieldId, field))}
                  </div>
                </>
              );
            }

            // Vertical: column fill (first half left, second half right)
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
  );
}
