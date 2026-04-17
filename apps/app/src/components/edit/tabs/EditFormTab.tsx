import { DynamicForm } from "@/components/edit/DynamicForm";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { extractDbFieldName } from "@/hooks/useDynamicFields";
import { useEditForm } from "@/hooks/useEditForm";
import { useResolveConditions } from "@/hooks/useResolveConditions";
import { routeStore, generateSlug, getDatabase } from "@breedhub/rxdb-store";
import { getValueForLabel } from "@/components/space/utils/filter-url-helpers";
import { useSignals } from "@preact/signals-react/runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditFieldConfig } from "@/types/field-config";

type FieldConfig = EditFieldConfig;

interface EditFormTabProps {
  fields?: Record<string, FieldConfig>;
  onLoadedCount?: (count: number) => void;
  entityType?: string;
  onSaveReady?: (handler: () => Promise<false | true | { created: any } | void>) => void;
  onDirtyChange?: (dirty: boolean) => void;
  isCreateMode?: boolean;
  onCreateNameChange?: (name: string) => void;
}

/**
 * EditFormTab - Dynamic form tab for edit page
 *
 * Uses DynamicForm for rendering and validation.
 * Uses useEditForm hook for form state and save via spaceStore.update().
 * In create mode, creates a new entity on save and navigates to its edit page.
 */
export function EditFormTab({ fields, onLoadedCount, entityType, onSaveReady, onDirtyChange, isCreateMode, onCreateNameChange }: EditFormTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const validateRef = useRef<(() => boolean) | undefined>(undefined);

  const handleCreated = useCallback(async (entity: any) => {
    const slug = entity.slug || generateSlug(entity.name || '', entity.id);

    // Cache route locally so SlugResolver finds it before push completes
    await routeStore.saveRoute({
      slug,
      entity: entityType || '',
      entity_id: entity.id,
      entity_partition_id: entity.breed_id || '',
      partition_field: entity.breed_id ? 'breed_id' : '',
      model: entityType || '',
    });

    // Build initial data client-side (before push creates it on server via triggers)
    try {
      const db = await getDatabase();
      const collections = db.collections as Record<string, any>;
      const collection = collections[entityType || ''];
      if (collection) {
        const doc = await collection.findOne(entity.id).exec();
        if (doc) {
          const patchData: Record<string, any> = {};

          // Timeline from date_of_birth/date_of_death
          if (entity.date_of_birth || entity.date_of_death) {
            const { buildInitialTimeline } = await import('@breedhub/rxdb-store');
            const timeline = buildInitialTimeline(entity.date_of_birth, entity.date_of_death);
            if (timeline) patchData.timeline = timeline;
          }

          // Pedigree from father/mother (mirrors server trigger)
          if (entity.father_id || entity.mother_id) {
            const { buildInitialPedigree } = await import('@breedhub/rxdb-store');
            const petCollection = collections.pet;
            let fatherPedigree = null;
            let motherPedigree = null;

            if (entity.father_id && petCollection) {
              const father = await petCollection.findOne(entity.father_id).exec();
              if (father) fatherPedigree = father.toJSON().pedigree;
            }
            if (entity.mother_id && petCollection) {
              const mother = await petCollection.findOne(entity.mother_id).exec();
              if (mother) motherPedigree = mother.toJSON().pedigree;
            }

            const pedigree = buildInitialPedigree(
              entity.father_id, entity.father_breed_id || entity.breed_id,
              fatherPedigree,
              entity.mother_id, entity.mother_breed_id || entity.breed_id,
              motherPedigree,
            );
            if (Object.keys(pedigree).length > 0) patchData.pedigree = pedigree;
          }

          if (Object.keys(patchData).length > 0) {
            await doc.patch(patchData);
          }
        }
      }
    } catch { /* non-critical */ }

    // Navigation moved to caller (EditPageTemplate) — depends on context
    // (Save button → public page; Tab switch → edit page with target tab)
  }, [entityType]);

  const { formChanges, hasChanges, handleFieldChange: rawHandleFieldChange, handleSave, markCurrentAsBaseline } = useEditForm({
    entityType: entityType || '',
    entityId: selectedEntity?.id,
    isCreateMode,
    onCreated: isCreateMode ? handleCreated : undefined,
    currentEntity: selectedEntity,
  });

  // Pre-fill fields with prefillFromFilter: true from URL params in create mode
  const [prefillDone, setPrefillDone] = useState(false);
  useEffect(() => {
    if (!isCreateMode || !fields || prefillDone) return;
    if (Object.keys(fields).length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    const prefillFields = Object.entries(fields)
      .filter(([, config]) => config.prefillFromFilter)
      .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));

    if (prefillFields.length === 0) {
      setPrefillDone(true);
      return;
    }

    const resolvePrefills = async () => {
      const rxdb = await getDatabase();
      const resolved: Array<{ dbName: string; value: string }> = [];

      for (const [fieldId, fieldConfig] of prefillFields) {
        const dbName = fieldId.replace(/^[^_]+_field_/, '');
        let value = params.get(dbName);
        if (!value) {
          const withoutId = dbName.replace(/_id$/, '');
          value = params.get(withoutId);
        }
        if (!value) {
          for (const [key, urlValue] of params.entries()) {
            if (key === 'entity' || resolved.some(r => r.dbName === key)) continue;
            if (fieldConfig.referencedTable && !isUUID(urlValue)) {
              const resolvedId = await getValueForLabel(fieldConfig as any, urlValue, rxdb as any);
              if (resolvedId) {
                value = urlValue;
                break;
              }
            }
          }
        }
        if (value) {
          if (!isUUID(value) && fieldConfig.referencedTable) {
            const resolvedId = await getValueForLabel(fieldConfig as any, value, rxdb as any);
            resolved.push({ dbName, value: resolvedId || value });
          } else {
            resolved.push({ dbName, value });
          }
        }
      }

      const timeouts: ReturnType<typeof setTimeout>[] = [];
      let delay = 0;
      for (const { dbName, value } of resolved) {
        timeouts.push(setTimeout(() => { rawHandleFieldChange(dbName, value); }, delay));
        delay += 100;
      }
      const appliedDbNames = new Set(resolved.map(r => r.dbName));
      for (const [fieldId, fieldConfig] of Object.entries(fields)) {
        if (fieldConfig.defaultValue && fieldConfig.defaultValue !== '0' && fieldConfig.defaultValue !== '') {
          const dbName = fieldId.replace(/^[^_]+_field_/, '');
          if (!appliedDbNames.has(dbName)) {
            timeouts.push(setTimeout(() => { rawHandleFieldChange(dbName, fieldConfig.defaultValue); }, delay));
            delay += 50;
          }
        }
      }
      timeouts.push(setTimeout(() => { setPrefillDone(true); markCurrentAsBaseline(); }, delay));
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

  // Wrap handleSave with validation from DynamicForm
  const validatedSave = useCallback(async (): Promise<boolean | void | { created: any }> => {
    if (!validateRef.current || !validateRef.current()) return false;
    const result = await handleSave();
    if (result?.created) return { created: result.created };
    return true;
  }, [handleSave]);

  // Register save handler with parent (with validation)
  useEffect(() => {
    if (onSaveReady) onSaveReady(validatedSave);
  }, [onSaveReady, validatedSave]);

  // Notify parent about dirty state changes
  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  // Report field count
  const fieldCount = useMemo(() => {
    if (!fields) return 0;
    return Object.values(fields).filter(f => !f.hidden).length;
  }, [fields]);

  useEffect(() => {
    onLoadedCount?.(fieldCount);
  }, [fieldCount, onLoadedCount]);

  return (
    <DynamicForm
      fields={fields}
      getValue={getValue}
      onChange={handleFieldChange}
      entity={selectedEntity}
      formChanges={formChanges}
      readonlyConditions={conditionNames ? { conditions, messages } : undefined}
      variant="page"
      onValidateReady={(fn) => { validateRef.current = fn; }}
    />
  );
}
