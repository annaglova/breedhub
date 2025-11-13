import { useCallback } from 'react';

/**
 * Hook for handling page menu actions
 *
 * Provides handlers for common page actions like edit, copy, etc.
 * Can be extended with custom action handlers
 *
 * @param entity - Current entity data
 * @param customHandlers - Custom action handlers
 */
export function usePageActions(
  entity: any,
  customHandlers?: Record<string, () => void>
) {
  const handleEdit = useCallback(() => {
    console.log('[PageActions] Edit:', entity);
    // TODO: Navigate to edit page
  }, [entity]);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      console.log('[PageActions] Link copied:', url);
      // TODO: Show toast notification
    });
  }, []);

  const handleCopyName = useCallback(() => {
    const name = entity?.name || entity?.label || '';
    navigator.clipboard.writeText(name).then(() => {
      console.log('[PageActions] Name copied:', name);
      // TODO: Show toast notification
    });
  }, [entity]);

  const handleMakeNote = useCallback(() => {
    console.log('[PageActions] Make note:', entity);
    // TODO: Open notes dialog
  }, [entity]);

  const handleBugReport = useCallback(() => {
    console.log('[PageActions] Bug report');
    // TODO: Open bug report dialog
  }, []);

  const handleShare = useCallback(() => {
    console.log('[PageActions] Share:', entity);
    // TODO: Open share dialog
  }, [entity]);

  const handleDelete = useCallback(() => {
    console.log('[PageActions] Delete:', entity);
    // TODO: Open delete confirmation dialog
  }, [entity]);

  const handleExport = useCallback(() => {
    console.log('[PageActions] Export:', entity);
    // TODO: Export entity data
  }, [entity]);

  // Default action handlers
  const defaultHandlers: Record<string, () => void> = {
    edit: handleEdit,
    copy_link: handleCopyLink,
    copy_name: handleCopyName,
    make_note: handleMakeNote,
    bug_report: handleBugReport,
    share: handleShare,
    delete: handleDelete,
    export: handleExport,
  };

  /**
   * Execute action by name
   */
  const executeAction = useCallback((action: string) => {
    // Try custom handler first
    if (customHandlers?.[action]) {
      customHandlers[action]();
      return;
    }

    // Fall back to default handler
    if (defaultHandlers[action]) {
      defaultHandlers[action]();
      return;
    }

    console.warn(`[PageActions] Unknown action: ${action}`);
  }, [customHandlers, defaultHandlers]);

  return {
    executeAction,
    handlers: {
      ...defaultHandlers,
      ...customHandlers,
    },
  };
}
