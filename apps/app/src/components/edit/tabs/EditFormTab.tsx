import { DynamicFormField } from "@/components/edit/DynamicFormField";
import { FormGroupLayout } from "@/components/edit/FormGroupLayout";
import { useFormFieldGrouping } from "@/components/edit/useFormFieldGrouping";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useDynamicFields, extractDbFieldName } from "@/hooks/useDynamicFields";
import { useEditForm } from "@/hooks/useEditForm";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useResolveConditions } from "@/hooks/useResolveConditions";
import { useJunctionFilterIds } from "@breedhub/rxdb-store";
import { generateSlug, getValueForLabel } from "@/components/space/utils/filter-url-helpers";
import { getDatabase } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  prefillFromFilter?: boolean;
  defaultValue?: string;
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
    // Use server-generated slug if available, otherwise generate client-side (same algorithm)
    const slug = entity.slug || generateSlug(entity.name || '', entity.id);
    // Navigate to edit page via top-level pretty URL (e.g., /my-pet-name/edit)
    navigate(`/${slug}/edit`, { replace: true });
  }, [navigate]);

  const { formChanges, hasChanges, handleFieldChange: rawHandleFieldChange, handleSave, markCurrentAsBaseline } = useEditForm({
    entityType: entityType || '',
    entityId: selectedEntity?.id,
    isCreateMode,
    onCreated: isCreateMode ? handleCreated : undefined,
  });

  // Pre-fill fields with prefillFromFilter: true from URL params in create mode
  // Supports both UUID values (breed_id=UUID) and slug values (breed=chihuahua)
  const [prefillDone, setPrefillDone] = useState(false);
  useEffect(() => {
    if (!isCreateMode || !fields || prefillDone) return;
    if (Object.keys(fields).length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    // Collect prefill fields and sort by order (parent fields first, e.g., pet_type before breed)
    const prefillFields = Object.entries(fields)
      .filter(([, config]) => config.prefillFromFilter)
      .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));

    if (prefillFields.length === 0) {
      setPrefillDone(true);
      return;
    }

    // Resolve all prefill values (slug → UUID if needed), then apply sequentially
    const resolvePrefills = async () => {
      const rxdb = await getDatabase();
      const resolved: Array<{ dbName: string; value: string }> = [];

      for (const [fieldId, fieldConfig] of prefillFields) {
        const dbName = fieldId.replace(/^[^_]+_field_/, '');

        // Try to find URL param: first by dbName (breed_id), then by slug variants
        let value = params.get(dbName);
        if (!value) {
          // Try without _id suffix (breed_id → breed)
          const withoutId = dbName.replace(/_id$/, '');
          value = params.get(withoutId);
        }
        if (!value) {
          // Try all remaining params — match by resolving against referencedTable
          for (const [key, urlValue] of params.entries()) {
            if (key === 'entity' || resolved.some(r => r.dbName === key)) continue;
            if (fieldConfig.referencedTable && !isUUID(urlValue)) {
              const resolvedId = await getValueForLabel(fieldConfig as any, urlValue, rxdb);
              if (resolvedId) {
                value = urlValue;
                break;
              }
            }
          }
        }

        if (value) {
          // Resolve slug to UUID if needed
          if (!isUUID(value) && fieldConfig.referencedTable) {
            const resolvedId = await getValueForLabel(fieldConfig as any, value, rxdb);
            resolved.push({ dbName, value: resolvedId || value });
          } else {
            resolved.push({ dbName, value });
          }
        }
      }

      // Apply sequentially with delay for cascade dependencies
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      let delay = 0;

      for (const { dbName, value } of resolved) {
        timeouts.push(setTimeout(() => {
          rawHandleFieldChange(dbName, value);
        }, delay));
        delay += 100;
      }

      // Apply defaultValue for fields that haven't been prefilled
      const appliedDbNames = new Set(resolved.map(r => r.dbName));
      for (const [fieldId, fieldConfig] of Object.entries(fields)) {
        if (fieldConfig.defaultValue && fieldConfig.defaultValue !== '0' && fieldConfig.defaultValue !== '') {
          const dbName = fieldId.replace(/^[^_]+_field_/, '');
          if (!appliedDbNames.has(dbName)) {
            timeouts.push(setTimeout(() => {
              rawHandleFieldChange(dbName, fieldConfig.defaultValue);
            }, delay));
            delay += 50;
          }
        }
      }

      // Mark as done after last timeout
      timeouts.push(setTimeout(() => {
        setPrefillDone(true);
        markCurrentAsBaseline();
      }, delay));

      return () => timeouts.forEach(clearTimeout);
    };

    const cleanup = resolvePrefills();
    return () => { cleanup.then(fn => fn?.()); };
  }, [isCreateMode, fields, rawHandleFieldChange, prefillDone]);

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

  // Validation
  const { errors, touched, validateAll, touchAndValidate } = useFormValidation();


  // Wrap handleSave with validation
  const validatedSave = useCallback(async () => {
    if (!fields) return;
    const visibleFields = Object.fromEntries(
      Object.entries(fields).filter(([, c]) => !c.hidden)
    );
    const isValid = validateAll(
      visibleFields,
      (key) => formChanges[extractDbFieldName(key)] ?? selectedEntity?.[extractDbFieldName(key)],
      extractDbFieldName
    );
    if (!isValid) return;
    await handleSave();
  }, [fields, formChanges, selectedEntity, validateAll, handleSave]);

  // Register save handler with parent (with validation)
  useEffect(() => {
    if (onSaveReady) {
      onSaveReady(validatedSave);
    }
  }, [onSaveReady, validatedSave]);

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
  // Conditional visibility check for visibleWhen fields
  const shouldRenderField = useCallback((fieldId: string, field: FieldConfig) => {
    if (!field.visibleWhen) return true;
    const depDbName = extractDbFieldName(field.visibleWhen.field);
    const currentValue = formChanges[depDbName] ?? selectedEntity?.[depDbName];
    const allowedValues = Array.isArray(field.visibleWhen.value)
      ? field.visibleWhen.value
      : [field.visibleWhen.value];
    return !!currentValue && allowedValues.includes(currentValue);
  }, [formChanges, selectedEntity]);

  // Junction table wrapper for many-to-many filtering
  const wrapWithJunction = useCallback((fieldId: string, field: FieldConfig, Component: React.ComponentType<any>, fieldProps: any) => {
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
    return null;
  }, [getParentFieldValue]);

  // Wrap getFieldProps to inject error/touched and validated change handler
  const getFieldPropsWithValidation = useCallback((fieldId: string, field: FieldConfig) => {
    const dbName = extractDbFieldName(fieldId);
    const props = getFieldProps(fieldId, field);

    // Wrap change handlers to add real-time validation
    const wrapHandler = (originalHandler: any) => {
      if (!originalHandler) return originalHandler;
      return (value: any) => {
        originalHandler(value);
        touchAndValidate(dbName, field, value);
      };
    };

    return {
      ...props,
      onValueChange: wrapHandler(props.onValueChange),
      onChange: props.onChange ? wrapHandler(props.onChange) : undefined,
      onCheckedChange: props.onCheckedChange ? wrapHandler(props.onCheckedChange) : undefined,
      error: touched[dbName] ? errors[dbName] : undefined,
      touched: touched[dbName],
    };
  }, [getFieldProps, errors, touched, touchAndValidate]);

  const renderField = (fieldId: string, field: FieldConfig) => (
    <DynamicFormField
      fieldId={fieldId}
      field={field}
      entity={selectedEntity}
      formChanges={formChanges}
      handleFieldChange={handleFieldChange}
      getFieldProps={getFieldPropsWithValidation}
      shouldRender={shouldRenderField}
      wrapComponent={wrapWithJunction}
    />
  );

  return (
    <div className="space-y-4">
      {groupedFields.map((group, idx) => (
        <div key={group.label ?? idx}>
          {group.label && (
            <h3 className="flex w-full items-center text-2xl leading-[30px] font-bold text-sub-header-color bg-header-ground/75 px-4 sm:px-6 py-2 mb-4 mt-4">
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
  );
}
