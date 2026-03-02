import { useSelectedEntity } from "@/contexts/SpaceContext";
import { dictionaryStore } from "@breedhub/rxdb-store";
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
}

interface EditFormTabProps {
  fields?: Record<string, FieldConfig>;
  onLoadedCount?: (count: number) => void;
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
 * Currently read-only (MVP) - saving in next iteration.
 */
export function EditFormTab({ fields, onLoadedCount }: EditFormTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();

  // Sort fields by sortOrder
  const sortedFields = useMemo(() => {
    if (!fields) return [];
    return Object.entries(fields).sort(
      ([, a], [, b]) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
  }, [fields]);

  // Report field count
  useEffect(() => {
    onLoadedCount?.(sortedFields.length);
  }, [sortedFields.length, onLoadedCount]);

  if (!fields || sortedFields.length === 0) {
    return (
      <div className="py-8 text-center text-secondary">
        No fields configured
      </div>
    );
  }

  return (
    <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2 py-2">
      {sortedFields.map(([fieldId, field]) => {
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
        const value = selectedEntity?.[dbFieldName] ?? "";

        return (
          <div key={fieldId} className="space-y-2">
            <Component
              label={field.displayName}
              value={value}
              required={field.required}
              placeholder={field.placeholder}
              referencedTable={field.referencedTable}
              referencedFieldID={field.referencedFieldID}
              referencedFieldName={field.referencedFieldName}
              {...(field.dataSource ? { dataSource: field.dataSource } : {})}
              options={field.options || []}
              disabled
            />
          </div>
        );
      })}
    </div>
  );
}
