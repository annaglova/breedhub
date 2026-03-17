import { FORM_COMPONENT_MAP } from "@/components/edit/componentMap";
import { useFormFieldGrouping } from "@/components/edit/useFormFieldGrouping";
import { PetPickerInput } from "@/components/edit/inputs/PetPickerInput";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useDynamicFields, extractDbFieldName } from "@/hooks/useDynamicFields";
import { useEditForm } from "@/hooks/useEditForm";
import { useResolveConditions } from "@/hooks/useResolveConditions";
import { useJunctionFilterIds } from "@breedhub/rxdb-store";
import { normalizeForUrl } from "@/components/space/utils/filter-url-helpers";
import { useSignals } from "@preact/signals-react/runtime";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const componentMap = FORM_COMPONENT_MAP;

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
  visibleWhen?: { field: string; value: string | string[] };
  validation?: any;
  options?: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
  group?: string;
  groupLayout?: "horizontal" | "vertical";
  pairedField?: string;
  sexFilter?: "male" | "female";
  hidden?: boolean;
  // Junction table filtering (many-to-many)
  junctionTable?: string;
  junctionField?: string;
  junctionFilterField?: string;
}

/**
 * Wrapper for fields with junction table filtering (hooks can't be called in loops).
 */
function JunctionFilterField({
  field,
  Component,
  parentFieldValue,
  ...componentProps
}: {
  field: FieldConfig;
  Component: React.ComponentType<any>;
  parentFieldValue?: string;
  [key: string]: any;
}) {
  const { filterByIds, junctionFilter } = useJunctionFilterIds({
    junctionTable: field.junctionTable!,
    junctionField: field.junctionField!,
    junctionFilterField: field.junctionFilterField!,
    filterValue: parentFieldValue,
  });

  return (
    <Component
      {...componentProps}
      filterByIds={filterByIds}
      junctionFilter={junctionFilter}
    />
  );
}

interface EditFormTabProps {
  fields?: Record<string, FieldConfig>;
  onLoadedCount?: (count: number) => void;
  entityType?: string;
  onSaveReady?: (handler: () => Promise<void>) => void;
  onDirtyChange?: (dirty: boolean) => void;
  isCreateMode?: boolean;
  onCreateNameChange?: (name: string) => void;
}

/**
 * EditFormTab - Dynamic form tab for edit page
 *
 * Reads fields from tab config and renders them using componentMap.
 * Uses useDynamicFields hook for cascade filtering and field props.
 * Uses useEditForm hook for form state and save via spaceStore.update().
 * In create mode, creates a new entity on save and navigates to its edit page.
 */
export function EditFormTab({ fields, onLoadedCount, entityType, onSaveReady, onDirtyChange, isCreateMode, onCreateNameChange }: EditFormTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const navigate = useNavigate();

  const handleCreated = useCallback((entity: any) => {
    const slug = entity.slug || normalizeForUrl(entity.name || entity.id);
    // Navigate to edit page via top-level pretty URL (e.g., /my-pet-name/edit)
    navigate(`/${slug}/edit`, { replace: true });
  }, [navigate]);

  const { formChanges, hasChanges, handleFieldChange: rawHandleFieldChange, handleSave } = useEditForm({
    entityType: entityType || '',
    entityId: selectedEntity?.id,
    isCreateMode,
    onCreated: isCreateMode ? handleCreated : undefined,
  });

  // Wrap handleFieldChange to intercept name changes in create mode
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    rawHandleFieldChange(fieldName, value);
    if (isCreateMode && fieldName === 'name' && onCreateNameChange) {
      onCreateNameChange(value);
    }
  }, [rawHandleFieldChange, isCreateMode, onCreateNameChange]);

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

  const { getFieldProps, getParentFieldValue } = useDynamicFields({
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
  const groupedFields = useFormFieldGrouping(fields);

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

    // Conditional visibility: show field only when another field has a specific value
    if (field.visibleWhen) {
      const depDbName = extractDbFieldName(field.visibleWhen.field);
      const currentValue = formChanges[depDbName] ?? selectedEntity?.[depDbName];
      const allowedValues = Array.isArray(field.visibleWhen.value)
        ? field.visibleWhen.value
        : [field.visibleWhen.value];
      if (!currentValue || !allowedValues.includes(currentValue)) return null;
    }

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

    // Junction table filtering (many-to-many, e.g., coat_color filtered by breed)
    if (field.junctionTable && field.junctionField && field.junctionFilterField) {
      const parentFieldValue = getParentFieldValue(field);
      return (
        <div key={fieldId}>
          <JunctionFilterField
            field={field}
            Component={Component}
            parentFieldValue={parentFieldValue}
            {...fieldProps}
          />
        </div>
      );
    }

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
