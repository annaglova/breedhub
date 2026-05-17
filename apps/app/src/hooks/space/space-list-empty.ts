export function isListEmpty({
  isInitialLoad,
  isLoading,
  entitiesCount,
}: {
  isInitialLoad: boolean;
  isLoading: boolean;
  entitiesCount: number;
}): boolean {
  return !isInitialLoad && entitiesCount === 0 && !isLoading;
}
