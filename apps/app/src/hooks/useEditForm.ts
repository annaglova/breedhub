import { useCallback, useEffect, useRef, useState } from 'react';
import { spaceStore, toast } from '@breedhub/rxdb-store';
import { withCrudToast, entityLabel, entityRecordLabel } from '@/utils/crudToast';

interface UseEditFormOptions {
  entityType: string;
  entityId?: string;
  isCreateMode?: boolean;
  onCreated?: (entity: any) => void;
  /** Current entity (for update toasts: "Pet Rex updated"). Optional. */
  currentEntity?: any;
}

interface SaveResult {
  /** Set when create mode succeeded — contains the new entity */
  created?: any;
}

interface UseEditFormReturn {
  formChanges: Record<string, any>;
  hasChanges: boolean;
  handleFieldChange: (fieldName: string, value: any) => void;
  handleSave: () => Promise<SaveResult | void>;
  resetChanges: () => void;
  /** Mark current formChanges keys as baseline (not user changes) */
  markCurrentAsBaseline: () => void;
}

/**
 * Universal form state + save hook for edit pages.
 *
 * Tracks only changed fields and saves them via spaceStore.update().
 * In create mode, saves via spaceStore.create() and calls onCreated.
 * handleSave is referentially stable (reads changes from ref)
 * so it can be safely passed up via onSaveReady without re-registering.
 */
export function useEditForm({ entityType, entityId, isCreateMode, onCreated, currentEntity }: UseEditFormOptions): UseEditFormReturn {
  const [formChanges, setFormChanges] = useState<Record<string, any>>({});
  const formChangesRef = useRef<Record<string, any>>({});
  const baselineKeysRef = useRef<Set<string>>(new Set());
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;
  const currentEntityRef = useRef(currentEntity);
  currentEntityRef.current = currentEntity;

  // hasChanges ignores auto-filled baseline keys (prefill/defaults)
  const hasChanges = Object.keys(formChanges).some(key => !baselineKeysRef.current.has(key));

  const resetChanges = useCallback(() => {
    setFormChanges({});
    formChangesRef.current = {};
  }, []);

  // Reset form when entity changes
  useEffect(() => {
    resetChanges();
  }, [entityId, resetChanges]);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormChanges(prev => {
      const next = { ...prev, [fieldName]: value };
      formChangesRef.current = next;
      return next;
    });
  }, []);

  const handleSave = useCallback(async (): Promise<SaveResult | void> => {
    const changes = formChangesRef.current;
    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save');
      return;
    }

    if (isCreateMode) {
      // Use name from formChanges (what user just typed)
      const label = entityRecordLabel(entityType, changes);
      const result = await withCrudToast(
        () => spaceStore.create(entityType, changes),
        { label, verb: 'create' }
      );
      if (result.ok && result.data) {
        resetChanges();
        await onCreatedRef.current?.(result.data);
        return { created: result.data };
      }
      return;
    }

    if (!entityId) {
      toast.error(`${entityLabel(entityType)} not found`);
      return;
    }

    // Prefer new name if user is renaming, fall back to current
    const label = entityRecordLabel(entityType, {
      name: changes.name || currentEntityRef.current?.name,
    });
    const result = await withCrudToast(
      () => spaceStore.update(entityType, entityId, changes),
      { label, verb: 'update' }
    );
    if (result.ok) {
      resetChanges();
    }
  }, [entityType, entityId, isCreateMode, resetChanges]);

  const markCurrentAsBaseline = useCallback(() => {
    baselineKeysRef.current = new Set(Object.keys(formChangesRef.current));
  }, []);

  return {
    formChanges,
    hasChanges,
    handleFieldChange,
    handleSave,
    resetChanges,
    markCurrentAsBaseline,
  };
}
