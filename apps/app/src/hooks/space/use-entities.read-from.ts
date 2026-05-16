/**
 * Re-export of the runtime-resolved readFrom shape. The canonical definition
 * lives in `@breedhub/rxdb-store` (`tab-data.types.ts`) so `applyFilters` and
 * the apps layer share one type — keeping the resolver's output in sync with
 * what the store expects.
 */
export type { ResolvedReadFromConfig } from "@breedhub/rxdb-store";
