/**
 * Centralised cache policies — single source of truth for every TTL the
 * runtime caches use. Keeping the numbers here (instead of inline literals
 * scattered across the stores) makes it cheap to coordinate behaviour and
 * to spot drift when adding a new layer.
 *
 * Naming convention:
 *   `*_STALE_MS`  → stale-while-revalidate threshold. Cache returns
 *                   immediately, a background refresh fires only when
 *                   the data is older than this.
 *   `*_TTL_MS`    → hard TTL. Cache entry stops being served past this.
 *
 * If you add a new cache layer in the rxdb-store package, please:
 *   1. Add its constant here with a brief comment on what it gates.
 *   2. Import the constant where you use it; do NOT inline the literal.
 *   3. If the doc `breedhub-docs/frontend/app/data/CACHE_AUDIT_2026_04_28.md`
 *      mentions a new W#/P# item, update it to reference this file.
 */

/**
 * `loadChildRecords` returns the RxDB cache immediately and, if the oldest
 * record's `cachedAt` is older than this, kicks off a background refresh.
 * 5 min is a compromise: long enough that tab switching within a session
 * stays free of network traffic, short enough that records mutated by
 * another tab show up promptly. Bumped beyond 5 min only with telemetry
 * data (see W7).
 */
export const CHILD_RECORDS_STALE_MS = 5 * 60 * 1000;

/**
 * In-memory `mappingCache` inside `loadEntitiesViaMapping`. Same window as
 * child records on purpose — the mapping rows and their children change in
 * sync (e.g. pet_in_litter membership ↔ pet rows), so drifting them apart
 * would have either path stalled while the other was fresh.
 */
export const MAPPING_CACHE_STALE_MS = 5 * 60 * 1000;

/**
 * Dictionary records (lookup tables: sex, breed, contact, …) are
 * comparatively static; servers stamp `updated_at` per row, so we still
 * detect mutations promptly via the per-row staleness check inside
 * `dictionaryStore.runGetDictionary`. The 24h ceiling exists for the rare
 * row that lacks a server `updated_at` — re-fetched at most once a day.
 */
export const DICTIONARY_RECORDS_STALE_MS = 24 * 60 * 60 * 1000;

/**
 * Default TTL for `spaceStore.callRpc` callers that want caching but
 * don't pass an explicit `cacheTtlMs`. Keep small so RPC freshness is
 * close to network freshness; callers with longer-lived results (e.g.
 * judge tree levels) should pass their own TTL.
 */
export const RPC_CACHE_DEFAULT_TTL_MS = 60 * 1000;

/**
 * Soft cap on rows per universal child collection (`pet_children`,
 * `breed_children`, …). When `loadChildRecords` notices we crossed the
 * limit it evicts the coldest `(parentId, tableType)` group via the LRU
 * policy. The limit is generous on purpose — eviction is a backstop
 * against unbounded growth in long sessions, not a tight working set.
 */
export const CHILD_COLLECTION_RECORD_LIMIT = 5000;

/**
 * Eviction stops when the collection is back under
 * `LIMIT * EVICT_TARGET_RATIO`. Built-in headroom so we don't immediately
 * re-trigger on the next mutation.
 */
export const CHILD_COLLECTION_EVICT_TARGET_RATIO = 0.8;

/**
 * Any `(parentId, tableType)` group touched within this window is
 * "active" and shielded from eviction even if it's the oldest. Prevents
 * yanking records out from under a tab that's currently rendering them.
 */
export const CHILD_COLLECTION_EVICT_PROTECT_MS = 30 * 1000;
