import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dictionaryStore, toast } from '@breedhub/rxdb-store';

interface NavigateToTabParams {
  tab: string;
  fullscreen?: boolean;
}

type ActionParams = NavigateToTabParams | Record<string, any>;

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
  customHandlers?: Record<string, (params?: ActionParams) => void>
) {
  const navigate = useNavigate();
  const handleEdit = useCallback(() => {
    const slug = entity?.slug;
    if (!slug) {
      console.warn('[PageActions] Edit: missing entity slug');
      return;
    }
    navigate(`/${slug}/edit`);
  }, [entity, navigate]);

  const handleCopyLink = useCallback(() => {
    const slug = entity?.slug;
    if (!slug) {
      toast.warning('No link to copy');
      return;
    }
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }, [entity]);

  const handleCopyName = useCallback(() => {
    const name = entity?.name || entity?.label || '';
    if (!name) {
      toast.warning('No name to copy');
      return;
    }
    navigator.clipboard.writeText(name).then(() => {
      toast.success('Name copied');
    }).catch(() => {
      toast.error('Failed to copy name');
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

  const handleTestMating = useCallback(async () => {
    const slug = entity?.slug;
    if (!slug) {
      toast.warning('No pet selected');
      return;
    }

    // Resolve sex_id to determine father/mother URL param
    let param = 'father';
    if (entity?.sex_id) {
      try {
        const record = await dictionaryStore.getRecordById('sex', entity.sex_id);
        if (record?.code === 'female') {
          param = 'mother';
        }
      } catch {
        // fallback to father
      }
    }

    navigate(`/mating?${param}=${slug}`);
  }, [entity, navigate]);

  const handleNavigateToTab = useCallback((params?: ActionParams) => {
    const { tab, fullscreen } = (params || {}) as NavigateToTabParams;
    if (!tab) {
      console.warn('[PageActions] navigate_to_tab: missing tab param');
      return;
    }

    const slug = entity?.slug;
    if (!slug) {
      console.warn('[PageActions] navigate_to_tab: missing entity slug');
      return;
    }

    if (fullscreen) {
      // Navigate to fullscreen tab page: /{slug}/{tab}
      navigate(`/${slug}/${tab}`);
    } else {
      // Navigate to tab fragment: /{slug}#{tab}
      navigate(`/${slug}#${tab}`);
    }
  }, [entity, navigate]);

  // Default action handlers
  const defaultHandlers: Record<string, (params?: ActionParams) => void> = {
    edit: handleEdit,
    copy_link: handleCopyLink,
    copy_name: handleCopyName,
    make_note: handleMakeNote,
    bug_report: handleBugReport,
    share: handleShare,
    delete: handleDelete,
    export: handleExport,
    test_mating: handleTestMating,
    navigate_to_tab: handleNavigateToTab,
  };

  /**
   * Execute action by name with optional params
   */
  const executeAction = useCallback((action: string, params?: ActionParams) => {
    // Try custom handler first
    if (customHandlers?.[action]) {
      customHandlers[action](params);
      return;
    }

    // Fall back to default handler
    if (defaultHandlers[action]) {
      defaultHandlers[action](params);
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
