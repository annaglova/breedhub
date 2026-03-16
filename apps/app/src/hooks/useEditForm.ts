import { useCallback, useEffect, useRef, useState } from 'react';
import { spaceStore, toast } from '@breedhub/rxdb-store';

interface UseEditFormOptions {
  entityType: string;
  entityId?: string;
  isCreateMode?: boolean;
  onCreated?: (entity: any) => void;
}

interface UseEditFormReturn {
  formChanges: Record<string, any>;
  hasChanges: boolean;
  handleFieldChange: (fieldName: string, value: any) => void;
  handleSave: () => Promise<void>;
  resetChanges: () => void;
}

/**
 * Universal form state + save hook for edit pages.
 *
 * Tracks only changed fields and saves them via spaceStore.update().
 * In create mode, saves via spaceStore.create() and calls onCreated.
 * handleSave is referentially stable (reads changes from ref)
 * so it can be safely passed up via onSaveReady without re-registering.
 */
export function useEditForm({ entityType, entityId, isCreateMode, onCreated }: UseEditFormOptions): UseEditFormReturn {
  const [formChanges, setFormChanges] = useState<Record<string, any>>({});
  const formChangesRef = useRef<Record<string, any>>({});
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  const hasChanges = Object.keys(formChanges).length > 0;

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

  const handleSave = useCallback(async () => {
    const changes = formChangesRef.current;
    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save');
      return;
    }

    if (isCreateMode) {
      try {
        const entity = await spaceStore.create(entityType, changes);
        if (entity) {
          toast.success('Created');
          resetChanges();
          onCreatedRef.current?.(entity);
        }
      } catch (error) {
        console.error('[useEditForm] Create failed:', error);
        toast.error('Failed to create');
      }
      return;
    }

    if (!entityId) {
      toast.error('Entity not found');
      return;
    }

    try {
      await spaceStore.update(entityType, entityId, changes);
      toast.success('Saved');
      resetChanges();
    } catch (error) {
      console.error('[useEditForm] Save failed:', error);
      toast.error('Failed to save');
    }
  }, [entityType, entityId, isCreateMode, resetChanges]);

  return {
    formChanges,
    hasChanges,
    handleFieldChange,
    handleSave,
    resetChanges,
  };
}
