import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { spaceStore, toast } from '@breedhub/rxdb-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ui/components/dialog';
import { Button } from '@ui/components/button';

interface Dependency {
  label: string;
  count: number;
}

type DialogView = 'confirm' | 'blocked';

interface DeleteState {
  open: boolean;
  view: DialogView;
  loading: boolean;
  dependencies: Dependency[];
}

const INITIAL_STATE: DeleteState = {
  open: false,
  view: 'confirm',
  loading: false,
  dependencies: [],
};

/**
 * Hook for deleting main entities with dependency checking.
 *
 * UX flow:
 * 1. Click Delete → immediately show confirmation "Delete X?"
 * 2. Check dependencies in background (invisible to user)
 * 3. User clicks Delete → if blocked, switch to "Cannot delete" view
 * 4. If not blocked → proceed with deletion
 */
export function useDeleteEntity(
  entityType: string | undefined,
  entity: any,
) {
  const navigate = useNavigate();
  const [state, setState] = useState<DeleteState>(INITIAL_STATE);
  const checkResultRef = useRef<{ canDelete: boolean; dependencies: Dependency[] } | null>(null);

  const requestDelete = useCallback(async () => {
    if (!entityType || !entity?.id) return;

    checkResultRef.current = null;
    setState({ ...INITIAL_STATE, open: true });

    // Check dependencies in background
    try {
      const result = await spaceStore.checkDependencies(entityType, entity.id);
      checkResultRef.current = result;
    } catch (err) {
      console.error('[useDeleteEntity] Failed to check dependencies:', err);
      // On error, allow delete (fail-open for local-first UX)
      checkResultRef.current = { canDelete: true, dependencies: [] };
    }
  }, [entityType, entity?.id]);

  const handleConfirmDelete = useCallback(async () => {
    if (!entityType || !entity?.id) return;

    // If check not finished yet, wait for it
    if (!checkResultRef.current) {
      setState(prev => ({ ...prev, loading: true }));
      // Poll until check completes (should be fast)
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (checkResultRef.current) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    }

    const result = checkResultRef.current!;

    // If blocked, show dependencies instead of deleting
    if (!result.canDelete) {
      setState(prev => ({
        ...prev,
        loading: false,
        view: 'blocked',
        dependencies: result.dependencies,
      }));
      return;
    }

    // Proceed with deletion
    setState(prev => ({ ...prev, loading: true }));

    try {
      await spaceStore.delete(entityType, entity.id);
      toast.success(`${entity.name || 'Record'} deleted`);
      setState(INITIAL_STATE);
      // Navigate to public space list (e.g., /pets for pet entity)
      const spaceConfig = spaceStore.getSpaceConfig(entityType);
      const spacePath = spaceConfig?.slug ? `/${spaceConfig.slug}` : null;
      if (spacePath) {
        navigate(spacePath);
      } else {
        navigate(-1);
      }
    } catch (err) {
      console.error('[useDeleteEntity] Failed to delete:', err);
      toast.error('Failed to delete');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [entityType, entity?.id, entity?.name, navigate]);

  const handleClose = useCallback(() => {
    if (!state.loading) {
      setState(INITIAL_STATE);
    }
  }, [state.loading]);

  const DeleteDialog = (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {state.view === 'blocked'
              ? 'Cannot delete'
              : `Delete ${entity?.name || 'record'}?`
            }
          </DialogTitle>
        </DialogHeader>
        <div>
          <div className="modal-card">
            {state.view === 'blocked' ? (
              <div className="space-y-2">
                <p className="text-base">
                  This record has related data that must be removed first:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                  {state.dependencies.map((dep) => (
                    <li key={dep.label}>
                      {dep.label}: <span className="font-medium">{dep.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-base">
                This action cannot be undone.
              </p>
            )}
          </div>
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className={`small-button bg-secondary-100 hover:bg-secondary-200 focus-visible:bg-secondary-200 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300 ${state.view === 'blocked' ? 'col-span-2' : ''}`}
            >
              {state.view === 'blocked' ? 'Close' : 'Cancel'}
            </Button>
            {state.view === 'confirm' && (
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={state.loading}
                className="small-button bg-red-100 hover:bg-red-200 focus-visible:bg-red-300 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200"
              >
                {state.loading ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { requestDelete, DeleteDialog };
}
