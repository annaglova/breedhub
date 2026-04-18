import { useCallback, useEffect, useRef, useState } from "react";
import { generateSlug } from "@breedhub/rxdb-store";
import type { NavigateFunction } from "react-router-dom";

export type SaveResult = false | true | { created: any };

interface UseUnsavedChangesGuardOptions {
  isCreateMode?: boolean;
  navigate: NavigateFunction;
  saveHandlerRef: React.MutableRefObject<(() => Promise<SaveResult | void>) | null>;
}

export function useUnsavedChangesGuard({
  isCreateMode,
  navigate,
  saveHandlerRef,
}: UseUnsavedChangesGuardOptions) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const hasUnsavedRef = useRef(false);
  const sentinelPushedRef = useRef(false);
  const pendingNavigationRef = useRef<string | null>(null);

  const onDirtyChange = useCallback((dirty: boolean) => {
    setHasUnsavedChanges(dirty);
    hasUnsavedRef.current = dirty;
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (hasUnsavedChanges && !sentinelPushedRef.current) {
      window.history.pushState({ __unsavedGuard: true }, "");
      sentinelPushedRef.current = true;
    }

    if (!hasUnsavedChanges && sentinelPushedRef.current) {
      window.history.back();
      sentinelPushedRef.current = false;
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handler = () => {
      if (!hasUnsavedRef.current) return;

      window.history.pushState({ __unsavedGuard: true }, "");
      setShowLeaveDialog(true);
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      e.preventDefault();
      e.stopPropagation();
      pendingNavigationRef.current = href;
      setShowLeaveDialog(true);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [hasUnsavedChanges]);

  const handleLeaveDiscard = useCallback(() => {
    setShowLeaveDialog(false);
    hasUnsavedRef.current = false;
    setHasUnsavedChanges(false);

    const url = pendingNavigationRef.current;
    pendingNavigationRef.current = null;

    if (url) {
      setTimeout(() => navigate(url), 0);
    } else {
      sentinelPushedRef.current = false;
      window.history.go(-2);
    }
  }, [navigate]);

  const handleLeaveSave = useCallback(async () => {
    setShowLeaveDialog(false);

    const url = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    hasUnsavedRef.current = false;

    if (sentinelPushedRef.current) {
      sentinelPushedRef.current = false;
    }

    try {
      await saveHandlerRef.current?.();
    } catch {
      return;
    }

    setHasUnsavedChanges(false);
    if (url) {
      navigate(url);
    } else {
      window.history.back();
    }
  }, [navigate, saveHandlerRef]);

  const handleLeaveCancel = useCallback(() => {
    setShowLeaveDialog(false);
    pendingNavigationRef.current = null;
  }, []);

  const handleNavigateAway = useCallback(
    (url: string) => {
      if (hasUnsavedRef.current) {
        pendingNavigationRef.current = url;
        setShowLeaveDialog(true);
      } else {
        navigate(url);
      }
    },
    [navigate],
  );

  const handleBeforeTabChange = useCallback(
    async (targetFragment: string): Promise<boolean | void> => {
      if (isCreateMode && saveHandlerRef.current) {
        const result = await saveHandlerRef.current();
        if (result === false) {
          return false;
        }

        if (result && typeof result === "object" && result.created) {
          const entity = result.created;
          const slug =
            entity.slug ||
            (entity.name && entity.id
              ? generateSlug(entity.name, entity.id)
              : "");
          if (slug) {
            navigate(`/${slug}/edit#${targetFragment}`, { replace: true });
            return false;
          }
        }
      } else if (hasUnsavedRef.current && saveHandlerRef.current) {
        await saveHandlerRef.current();
      }
    },
    [isCreateMode, navigate, saveHandlerRef],
  );

  return {
    handleBeforeTabChange,
    handleLeaveCancel,
    handleLeaveDiscard,
    handleLeaveSave,
    handleNavigateAway,
    hasUnsavedChanges,
    onDirtyChange,
    setShowLeaveDialog,
    showLeaveDialog,
  };
}
