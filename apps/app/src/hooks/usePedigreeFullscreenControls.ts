import { useCallback, useMemo, useState } from "react";
import { mediaQueries } from "@/config/breakpoints";
import type { GenerationCount } from "@/components/shared/pedigree";

const PEDIGREE_GENERATIONS_KEY = "pedigree-generations";
const LINK_TO_PEDIGREE_KEY = "pedigree-link-mode";
const PEDIGREE_ZOOM_KEY = "pedigree-zoom";
const ZOOM_PRESETS = [80, 90, 100] as const;

interface UsePedigreeFullscreenControlsOptions {
  focusModeEnabled?: boolean;
}

export function usePedigreeFullscreenControls({
  focusModeEnabled = false,
}: UsePedigreeFullscreenControlsOptions) {
  const [pedigreeGenerations, setPedigreeGenerations] = useState<GenerationCount>(() => {
    const saved = sessionStorage.getItem(PEDIGREE_GENERATIONS_KEY);
    if (saved) return Number(saved) as GenerationCount;
    return window.matchMedia(mediaQueries["2xl"]).matches ? 5 : 4;
  });
  const [isPedigreeCollapsed, setIsPedigreeCollapsed] = useState(true);
  const [linkToPedigree, setLinkToPedigree] = useState(
    () => sessionStorage.getItem(LINK_TO_PEDIGREE_KEY) === "1",
  );
  const [pedigreeZoom, setPedigreeZoom] = useState(() => {
    const saved = sessionStorage.getItem(PEDIGREE_ZOOM_KEY);
    if (saved) return Number(saved);
    return 100;
  });

  const zoomIndex = ZOOM_PRESETS.indexOf(
    pedigreeZoom as (typeof ZOOM_PRESETS)[number],
  );
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_PRESETS.length - 1;

  const handleGenerationsChange = useCallback((count: GenerationCount) => {
    setPedigreeGenerations(count);
    sessionStorage.setItem(PEDIGREE_GENERATIONS_KEY, String(count));
  }, []);

  const handleLinkToPedigreeChange = useCallback((checked: boolean) => {
    setLinkToPedigree(checked);
    if (checked) {
      sessionStorage.setItem(LINK_TO_PEDIGREE_KEY, "1");
    } else {
      sessionStorage.removeItem(LINK_TO_PEDIGREE_KEY);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!canZoomOut) return;
    const zoom = ZOOM_PRESETS[zoomIndex - 1];
    setPedigreeZoom(zoom);
    sessionStorage.setItem(PEDIGREE_ZOOM_KEY, String(zoom));
  }, [canZoomOut, zoomIndex]);

  const handleZoomIn = useCallback(() => {
    if (!canZoomIn) return;
    const zoom = ZOOM_PRESETS[zoomIndex + 1];
    setPedigreeZoom(zoom);
    sessionStorage.setItem(PEDIGREE_ZOOM_KEY, String(zoom));
  }, [canZoomIn, zoomIndex]);

  const isPedigreeFocusMode = useMemo(() => {
    return isPedigreeCollapsed && focusModeEnabled;
  }, [focusModeEnabled, isPedigreeCollapsed]);

  return {
    canZoomIn,
    canZoomOut,
    handleGenerationsChange,
    handleLinkToPedigreeChange,
    handleZoomIn,
    handleZoomOut,
    isPedigreeCollapsed,
    isPedigreeFocusMode,
    linkToPedigree,
    pedigreeGenerations,
    pedigreeZoom,
    setIsPedigreeCollapsed,
  };
}
