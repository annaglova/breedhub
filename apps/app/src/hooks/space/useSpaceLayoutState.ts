import { useMemo } from "react";
import { mediaQueries } from "@/config/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface UseSpaceLayoutStateOptions {
  isFullscreen: boolean;
}

export function useSpaceLayoutState({
  isFullscreen,
}: UseSpaceLayoutStateOptions) {
  const isMoreThanMD = useMediaQuery(mediaQueries.md);
  const isMoreThanLG = useMediaQuery(mediaQueries.lg);
  const isMoreThan2XL = useMediaQuery(mediaQueries["2xl"]);
  const needCardClass = isMoreThanLG;

  const drawerMode = useMemo(() => {
    if (isFullscreen) return "over";
    if (isMoreThan2XL) return "side-transparent";
    if (isMoreThanMD) return "side";
    return "over";
  }, [isFullscreen, isMoreThan2XL, isMoreThanMD]);

  return {
    drawerMode,
    isMoreThan2XL,
    isMoreThanLG,
    needCardClass,
  };
}
