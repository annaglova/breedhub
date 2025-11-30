# Route Store & Store Refactoring Plan

## Overview

Plan for implementing RouteStore and refactoring shared logic across stores (SpaceStore, DictionaryStore, RouteStore).

---

## 1. Route Store Implementation

### Purpose
Resolve URL slugs to entity information for fullscreen pages.

**URL Pattern:** `/{slug}#{tab}` (e.g., `/affenpinscher#achievements`)

### Database Table: `routes` ✅ UPDATED

```sql
CREATE TABLE routes (
  slug VARCHAR(255) PRIMARY KEY,      -- slug як PK (унікальний)
  entity VARCHAR(50) NOT NULL,        -- 'breed', 'pet', 'account', 'contact'...
  entity_id UUID NOT NULL,
  model VARCHAR(50) NOT NULL,         -- 'breed', 'kennel', 'club', 'federation'...
  deleted BOOLEAN DEFAULT FALSE,      -- soft delete
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index для швидкого invalidate по entity_id
CREATE INDEX routes_entity_id_idx ON routes(entity, entity_id);

-- Index для фільтрації активних записів
CREATE INDEX routes_deleted_idx ON routes(deleted) WHERE deleted = FALSE;
```

**Migration від старої структури:**
```sql
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_redirect_to_fkey;
ALTER TABLE routes DROP COLUMN IF EXISTS redirect_to;
ALTER TABLE routes DROP CONSTRAINT routes_pkey CASCADE;
ALTER TABLE routes DROP COLUMN IF EXISTS id;
ALTER TABLE routes ADD PRIMARY KEY (slug);
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_slug_key;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS routes_entity_id_idx ON routes(entity, entity_id);
CREATE INDEX IF NOT EXISTS routes_deleted_idx ON routes(deleted) WHERE deleted = FALSE;
```

**Key Decision:** `model` field is ALWAYS filled, same as `entity` for simple cases:
- breed -> model: breed
- pet -> model: pet
- account -> model: kennel/club/federation (different rendering for same entity)

### Files to Create

#### 1.1 Schema: `packages/rxdb-store/src/collections/routes.schema.ts`

```typescript
import { RxJsonSchema } from 'rxdb';

export interface RouteDocument {
  slug: string;           // Primary key, unique
  entity: string;         // Table name: 'breed', 'pet', 'account'
  entity_id: string;      // UUID of the entity
  model: string;          // Rendering model: 'breed', 'kennel', 'club'
  cachedAt: number;       // Unix timestamp for TTL
}

export const routesSchema: RxJsonSchema<RouteDocument> = {
  title: 'routes',
  version: 0,
  primaryKey: 'slug',
  type: 'object',
  properties: {
    slug: { type: 'string', maxLength: 255 },
    entity: { type: 'string', maxLength: 50 },
    entity_id: { type: 'string', maxLength: 36 },
    model: { type: 'string', maxLength: 50 },
    cachedAt: { type: 'number' }
  },
  required: ['slug', 'entity', 'entity_id', 'model', 'cachedAt'],
  indexes: ['entity', 'entity_id']
};
```

#### 1.2 Store: `packages/rxdb-store/src/stores/route-store.signal-store.ts`

```typescript
// Core functionality:
// - Lazy collection creation
// - resolveRoute(slug) method
// - TTL-based cleanup (14 days, like DictionaryStore)
// - Local-first: RxDB -> Supabase fallback -> cache result
```

### Data Flow (Local-First)

```
URL: /affenpinscher#achievements
         ↓
RouteStore.resolveRoute('affenpinscher')
         ↓
    ┌────┴────┐
    ↓         ↓
  RxDB    (if not found)
  cache   → Supabase query (single record, indexed)
    ↓         ↓
    └────┬────┘
         ↓
   Cache in RxDB
         ↓
   Return { entity: 'breed', entity_id: 'uuid', model: 'breed' }
         ↓
   Load entity from SpaceStore
         ↓
   Render page with model-specific component
```

### URL Resolution Logic

```typescript
// In router or DynamicEntityPage
function needsRouteResolution(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);

  // Only single segment URLs need resolution
  if (segments.length !== 1) {
    return false;
  }

  const slug = segments[0];

  // Known routes don't need resolution
  const knownRoutes = ['breeds', 'pets', 'kennels', 'contacts', 'events', 'settings', 'profile'];

  return !knownRoutes.includes(slug);
}

// Examples:
// /affenpinscher         -> needs resolution (single unknown segment)
// /breeds                -> NO (known space)
// /breeds/affenpinscher  -> NO (has parent, entity type known)
// /settings              -> NO (known static route)
```

---

## 2. Store Refactoring Plan - Detailed Analysis

### Problem

**SpaceStore:** 114KB, 3430 lines
**DictionaryStore:** 21KB, 645 lines

Both stores have significant code duplication:

---

### 2.1 Duplicated: TTL & Cleanup Logic

**DictionaryStore (lines 45, 596-624):**
```typescript
private readonly TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

async cleanupExpired(): Promise<void> {
  const expiryTime = Date.now() - this.TTL;
  const expiredDocs = await this.collection
    .find({ selector: { cachedAt: { $lt: expiryTime } } })
    .exec();
  for (const doc of expiredDocs) {
    await doc.remove();
  }
}
```

**SpaceStore (lines 99, 3338-3402):**
```typescript
private readonly CHILD_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

async cleanupExpiredRecords(): Promise<void> {
  const expiryTime = Date.now() - this.CHILD_TTL;
  // Same logic, but loops through multiple collections
  for (const entityType of this.availableEntityTypes.value) { ... }
  for (const [collectionName, collection] of this.childCollections.entries()) { ... }
}
```

**Extract to:** `helpers/ttl-cleanup.helper.ts`

---

### 2.2 Duplicated: Periodic Cleanup Scheduler

**DictionaryStore (lines 113-118):**
```typescript
// Schedule periodic cleanup (every 24 hours)
setInterval(() => {
  this.cleanupExpired().catch(error => { ... });
}, 24 * 60 * 60 * 1000);
```

**SpaceStore (lines 177-182):**
```typescript
// Schedule periodic cleanup (every 24 hours)
setInterval(() => {
  this.cleanupExpiredRecords().catch(error => { ... });
}, 24 * 60 * 60 * 1000);
```

**Extract to:** `helpers/cleanup-scheduler.helper.ts`

---

### 2.3 Duplicated: Network Error Detection

**DictionaryStore (lines 448-465):**
```typescript
const isNetworkError = errorMessage.includes('fetch') ||
                      errorMessage.includes('network') ||
                      errorMessage.includes('disconnected') ||
                      errorMessage.includes('failed to fetch') ||
                      errorName.includes('network') ||
                      // ... 10+ more conditions
                      !navigator.onLine;
```

**SpaceStore (lines 1839-1851, 2482-2494):**
```typescript
// EXACT SAME CODE in two places within SpaceStore!
const isNetworkError = errorMessage.includes('fetch') ||
                      // ... same 10+ conditions
                      !navigator.onLine;
```

**Note:** SpaceStore has this duplicated TWICE internally (lines 1839 and 2482)!

**Extract to:** `helpers/network-helpers.ts`

---

### 2.4 Duplicated: Hybrid Search Logic (70% starts_with + 30% contains)

**DictionaryStore (lines 151-206):**
```typescript
// Phase 1: Starts with (high priority)
const startsWithLimit = Math.ceil(limit * 0.7);
// ... query with ilike `${search}%`

// Phase 2: Contains (lower priority) - 30% of limit
const remainingLimit = limit - startsWithResults.length;
// ... query with ilike `%${search}%` excluding starts_with
```

**SpaceStore (lines 2339-2416):**
```typescript
// Phase 1: Starts with (high priority, 70% of limit)
const startsWithLimit = Math.ceil(limit * 0.7);
// ... same logic

// Phase 2: Contains (lower priority) - only if we have room
const remainingLimit = limit - startsWithResults.length;
// ... same logic
```

**Also in SpaceStore offline mode (lines 2020-2099):** Similar hybrid search for RxDB

**Extract to:** `helpers/hybrid-search.helper.ts`

---

### 2.5 Duplicated: Offline Mode Fallback Pattern

**DictionaryStore (lines 334-337, 467-475):**
```typescript
// PREVENTIVE OFFLINE CHECK
if (!navigator.onLine) {
  return this.getDictionaryOffline(tableName, options);
}

// OFFLINE FALLBACK on error
return this.getDictionaryOffline(tableName, options);
```

**SpaceStore (lines 1639-1642, 1854-1858):**
```typescript
// PREVENTIVE OFFLINE CHECK
if (!navigator.onLine) {
  // ... same pattern, use RxDB directly
}

// OFFLINE FALLBACK on error
// ... same pattern
```

**Extract to:** `helpers/offline-fallback.helper.ts` or integrate with network-helpers

---

### 2.6 Duplicated: Collection Creation Pattern

**DictionaryStore (lines 80-101):**
```typescript
if (!this.db.dictionaries) {
  await this.db.addCollections({
    dictionaries: {
      schema: dictionariesSchema,
      migrationStrategies: { ... }
    }
  });
}
this.collection = this.db.dictionaries;
```

**SpaceStore (lines 917-935):**
```typescript
await this.db.addCollections({
  [entityType]: {
    schema: schema,
    migrationStrategies: { ... }
  }
});
```

**Extract to:** `helpers/collection-factory.helper.ts`

---

### 2.7 Internal SpaceStore Duplication

Within SpaceStore itself, there's duplication:

1. **Network error detection** - appears twice (lines 1839, 2482)
2. **Hybrid search** - appears in both online and offline modes
3. **applyFilters logic** - ~700 lines, could be split into smaller functions

---

## Solution: New Helper Structure

```
packages/rxdb-store/src/
├── helpers/
│   ├── index.ts                    # Re-exports all helpers
│   ├── ttl-cleanup.helper.ts       # TTL constants + cleanup function
│   ├── cleanup-scheduler.helper.ts # 24h interval scheduler
│   ├── network-helpers.ts          # isNetworkError(), isOnline()
│   ├── hybrid-search.helper.ts     # 70/30 search split logic
│   ├── offline-fallback.helper.ts  # Offline mode wrapper/decorator
│   └── collection-factory.helper.ts # getOrCreateCollection()
```

### Helper Implementations

#### `helpers/ttl-cleanup.helper.ts`
```typescript
import { RxCollection } from 'rxdb';

export const DEFAULT_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface CacheableDocument {
  cachedAt: number;
}

export async function cleanupExpiredDocuments<T extends CacheableDocument>(
  collection: RxCollection<T>,
  ttl: number = DEFAULT_TTL,
  logPrefix: string = '[Cleanup]'
): Promise<number> {
  const expiryTime = Date.now() - ttl;

  const expiredDocs = await collection
    .find({ selector: { cachedAt: { $lt: expiryTime } } })
    .exec();

  if (expiredDocs.length > 0) {
    console.log(`${logPrefix} Cleaning up ${expiredDocs.length} expired records`);

    for (const doc of expiredDocs) {
      await doc.remove();
    }
  }

  return expiredDocs.length;
}

export async function cleanupMultipleCollections(
  collections: Array<{ collection: RxCollection<any>; name: string }>,
  ttl: number = DEFAULT_TTL,
  logPrefix: string = '[Cleanup]'
): Promise<number> {
  let totalCleaned = 0;

  for (const { collection, name } of collections) {
    const cleaned = await cleanupExpiredDocuments(collection, ttl, `${logPrefix} ${name}`);
    totalCleaned += cleaned;
  }

  return totalCleaned;
}
```

#### `helpers/cleanup-scheduler.helper.ts`
```typescript
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export function schedulePeriodicCleanup(
  cleanupFn: () => Promise<void>,
  logPrefix: string = '[Cleanup]'
): NodeJS.Timeout {
  return setInterval(() => {
    cleanupFn().catch(error => {
      console.error(`${logPrefix} Periodic cleanup failed:`, error);
    });
  }, CLEANUP_INTERVAL);
}

export function runInitialCleanup(
  cleanupFn: () => Promise<void>,
  logPrefix: string = '[Cleanup]'
): void {
  cleanupFn().catch(error => {
    console.error(`${logPrefix} Initial cleanup failed:`, error);
  });
}
```

#### `helpers/network-helpers.ts`
```typescript
export function isOnline(): boolean {
  return navigator.onLine;
}

export function isNetworkError(error: unknown): boolean {
  const errorMessage = (error instanceof Error ? error.message : '').toLowerCase();
  const errorName = ((error as any)?.name || '').toLowerCase();
  const errorCode = ((error as any)?.code || '').toLowerCase();
  const errorString = String(error).toLowerCase();

  return errorMessage.includes('fetch') ||
         errorMessage.includes('network') ||
         errorMessage.includes('disconnected') ||
         errorMessage.includes('failed to fetch') ||
         errorName.includes('network') ||
         errorName.includes('fetch') ||
         errorName.includes('disconnected') ||
         errorCode.includes('network') ||
         errorCode.includes('disconnected') ||
         errorCode.includes('err_internet_disconnected') ||
         errorString.includes('err_internet_disconnected') ||
         (error instanceof TypeError && errorMessage.includes('fetch')) ||
         !navigator.onLine;
}
```

#### `helpers/hybrid-search.helper.ts`
```typescript
export interface HybridSearchConfig {
  startsWithRatio: number; // Default: 0.7 (70%)
  containsRatio: number;   // Default: 0.3 (30%)
}

export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  startsWithRatio: 0.7,
  containsRatio: 0.3,
};

export function calculateHybridLimits(
  totalLimit: number,
  config: HybridSearchConfig = DEFAULT_HYBRID_CONFIG
): { startsWithLimit: number; containsLimit: number } {
  const startsWithLimit = Math.ceil(totalLimit * config.startsWithRatio);
  const containsLimit = totalLimit - startsWithLimit;
  return { startsWithLimit, containsLimit };
}

// For Supabase queries
export function buildHybridSearchQueries(
  baseQuery: any,
  searchField: string,
  searchValue: string,
  config: HybridSearchConfig = DEFAULT_HYBRID_CONFIG
) {
  // Returns { startsWithQuery, containsQuery } builders
}

// For RxDB queries
export function buildHybridSearchSelectors(
  tableName: string,
  nameField: string,
  searchValue: string
) {
  const escapedSearch = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    startsWithSelector: {
      table_name: tableName,
      [nameField]: { $regex: `^${escapedSearch}`, $options: 'i' }
    },
    containsSelector: {
      table_name: tableName,
      [nameField]: { $regex: escapedSearch, $options: 'i' }
    }
  };
}
```

#### `helpers/collection-factory.helper.ts`
```typescript
import { RxDatabase, RxCollection, RxJsonSchema } from 'rxdb';

export async function getOrCreateCollection<T>(
  db: RxDatabase,
  name: string,
  schema: RxJsonSchema<T>,
  migrationStrategies?: Record<number, (doc: any) => any>
): Promise<RxCollection<T>> {
  // Check if already exists
  if (db.collections[name]) {
    return db.collections[name] as RxCollection<T>;
  }

  // Create new collection
  await db.addCollections({
    [name]: {
      schema,
      migrationStrategies: migrationStrategies || {}
    }
  });

  return db.collections[name] as RxCollection<T>;
}
```

### Refactored Store Usage

**DictionaryStore (after refactoring):**
```typescript
import {
  cleanupExpiredDocuments,
  DEFAULT_TTL
} from '../helpers/ttl-cleanup.helper';
import {
  schedulePeriodicCleanup,
  runInitialCleanup
} from '../helpers/cleanup-scheduler.helper';
import { isNetworkError, isOnline } from '../helpers/network-helpers';
import { getOrCreateCollection } from '../helpers/collection-factory.helper';

// In initialize():
this.collection = await getOrCreateCollection(this.db, 'dictionaries', dictionariesSchema);
runInitialCleanup(() => cleanupExpiredDocuments(this.collection!, DEFAULT_TTL, '[DictionaryStore]'));
schedulePeriodicCleanup(() => cleanupExpiredDocuments(this.collection!, DEFAULT_TTL, '[DictionaryStore]'));

// In getDictionary():
if (!isOnline()) {
  return this.getDictionaryOffline(...);
}

// In catch block:
if (isNetworkError(error)) {
  return this.getDictionaryOffline(...);
}
```

**SpaceStore (after refactoring):**
```typescript
import { cleanupMultipleCollections, DEFAULT_TTL } from '../helpers/ttl-cleanup.helper';
import { schedulePeriodicCleanup, runInitialCleanup } from '../helpers/cleanup-scheduler.helper';
import { isNetworkError, isOnline } from '../helpers/network-helpers';

// In initialize():
runInitialCleanup(() => this.cleanupAll());
schedulePeriodicCleanup(() => this.cleanupAll());

private async cleanupAll(): Promise<void> {
  const collections = [
    ...this.availableEntityTypes.value.map(type => ({
      collection: this.db.collections[type],
      name: type
    })),
    ...Array.from(this.childCollections.entries()).map(([name, col]) => ({
      collection: col,
      name
    }))
  ].filter(c => c.collection);

  await cleanupMultipleCollections(collections, DEFAULT_TTL, '[SpaceStore]');
}
```

**RouteStore (new, uses helpers from start):**
```typescript
import { cleanupExpiredDocuments, DEFAULT_TTL } from '../helpers/ttl-cleanup.helper';
import { schedulePeriodicCleanup, runInitialCleanup } from '../helpers/cleanup-scheduler.helper';
import { isNetworkError, isOnline } from '../helpers/network-helpers';
import { getOrCreateCollection } from '../helpers/collection-factory.helper';

// Clean, simple implementation using all helpers
```

---

## 3. TODO Checklist

### Phase 1: Extract Helpers (Foundation) ✅ COMPLETED

- [x] Create `helpers/` directory
- [x] Create `helpers/index.ts` (re-exports)
- [x] Create `helpers/ttl-cleanup.helper.ts`
  - [x] `DEFAULT_TTL` constant
  - [x] `CacheableDocument` interface
  - [x] `cleanupExpiredDocuments()` function
  - [x] `cleanupMultipleCollections()` function
- [x] Create `helpers/cleanup-scheduler.helper.ts`
  - [x] `CLEANUP_INTERVAL` constant
  - [x] `schedulePeriodicCleanup()` function
  - [x] `runInitialCleanup()` function
- [x] Create `helpers/network-helpers.ts`
  - [x] `isOnline()` function
  - [x] `isOffline()` function
  - [x] `isNetworkError()` function
- [x] Create `helpers/collection-factory.helper.ts`
  - [x] `getOrCreateCollection()` function
- [ ] Create `helpers/hybrid-search.helper.ts` (optional, can do later)
  - [ ] `HybridSearchConfig` interface
  - [ ] `calculateHybridLimits()` function
  - [ ] `buildHybridSearchSelectors()` function

### Phase 2: RouteStore Implementation ✅ COMPLETED

- [x] Create `collections/routes.schema.ts`
- [x] Create `stores/route-store.signal-store.ts` (using helpers)
- [x] Export from `index.ts`
- [x] Test: `resolveRoute(slug)` returns correct entity info

### Phase 3: Refactor Existing Stores ✅ COMPLETED

- [x] Refactor DictionaryStore to use helpers
  - [x] Replace TTL constant with import
  - [x] Replace cleanup logic with helper
  - [x] Replace scheduler with helper
  - [x] Replace network detection with helper
  - [x] Remove verbose console.logs
- [x] Refactor SpaceStore to use helpers
  - [x] Replace CHILD_TTL with import
  - [x] Replace cleanup logic with cleanupMultipleCollections helper
  - [x] Replace scheduler with helper
  - [x] Replace network detection (3 places) with isOffline/isNetworkError helpers
  - [ ] Optionally: extract hybrid search to helper (deferred)

### Phase 4: Router Integration ✅ COMPLETED

- [x] Create `SlugResolver.tsx` component (замість DynamicEntityPage)
- [x] Add catch-all route `/:slug` in AppRouter
- [x] Implement redirect with `state: { fullscreen: true }`
- [x] Update SpaceComponent to detect fullscreen state and force drawer mode "over"
- [x] Update PublicPageTemplate with `isFullscreenMode` prop

#### Route Resolution Flow

```
При відкритті entity (expand/click):
  → Зберігаємо в routes колекцію { slug, entity, entity_id, model }

При зовнішньому URL /affenpinscher:
  → RxDB routes → знайшли? → redirect до /breeds/:id з fullscreen state
  → Не знайшли → Supabase routes → кеш + redirect
  → Не знайшли → 404
```

**Переваги:**
- Offline для всього, що юзер відкривав
- Не забиваємо кеш непотрібним (тільки реально відкриті entities)
- Зовнішні лінки працюють (з fallback до Supabase)

#### Slug Storage Decision

**slug залишається в entity таблиці** (не виносимо в routes):
- При завантаженні списку вже отримуємо slug разом з entity
- Консистентність - slug логічно належить entity
- Routes таблиця - це lookup index для зворотнього резолву (slug → entity)
- Offline-first - коли юзер клікає entity в списку, slug вже є

```
breeds таблиця:
  id, name, slug, ...  ← source of truth

routes таблиця (lookup index):
  slug (PK), entity, entity_id, model  ← для резолву /affenpinscher
```

#### Files Changed

- `apps/app/src/pages/SlugResolver.tsx` - NEW (резолвить slug, робить redirect)
- `apps/app/src/router/AppRouter.tsx` - catch-all route `:slug`
- `apps/app/src/pages/SpacePage.tsx` - DetailWrapper для fullscreen state
- `apps/app/src/components/space/SpaceComponent.tsx` - fullscreen detection, force "over" mode
- `apps/app/src/components/template/PublicPageTemplate.tsx` - `isFullscreenMode` prop

### Phase 5: Routes Population ✅ COMPLETED

- [x] Додати `entitySchemaModel` до SpaceConfig типів
- [x] Метод `RouteStore.saveRoute({ slug, entity, entity_id, model })`
- [x] Викликати з SpaceComponent при handleEntityClick

#### Implementation Details

```typescript
// SpaceComponent.tsx - handleEntityClick
const handleEntityClick = (entity) => {
  const slug = entity.slug || normalizeForUrl(entity.name);

  // Save route for offline access
  routeStore.saveRoute({
    slug,
    entity: config.entitySchemaName,    // 'breed'
    entity_id: entity.id,
    model: config.entitySchemaModel     // 'breed', 'kennel', 'club'
  });

  navigate(`${slug}#overview`);
};
```

#### Config Structure

```json
{
  "entitySchemaName": "breed",    // Table/entity type
  "entitySchemaModel": "breed"    // Rendering model (fallback to entitySchemaName)
}
```

### Phase 6: URL Generation (Already Done)

- [x] Update `handleEntityClick` to use `entity.slug` if available
- [x] Update auto-select first entity to use `entity.slug`
- [x] Add `slug` field to breed collection schema
- [x] Ensure `slug` field syncs from Supabase

---

## 4. Architecture Summary

```
packages/rxdb-store/src/
├── collections/
│   ├── app-config.schema.ts
│   ├── dictionaries.schema.ts
│   ├── breed-children.schema.ts
│   └── routes.schema.ts          # NEW
├── helpers/
│   └── collection-helpers.ts     # NEW - shared logic
├── stores/
│   ├── app-store.signal-store.ts
│   ├── app-config.signal-store.ts
│   ├── dictionary-store.signal-store.ts
│   ├── space-store.signal-store.ts
│   └── route-store.signal-store.ts  # NEW
└── index.ts
```

---

## 5. Key Decisions Made

1. **Routes table always has `model` filled** - no if/else in code, always process both `entity` and `model`

2. **Slug from DB first** - `entity.slug || normalizeForUrl(entity.name)` pattern

3. **Local-first for routes** - RxDB cache with Supabase fallback, not direct Supabase calls

4. **Separate RouteStore** - not in SpaceStore, cleaner architecture

5. **Shared helpers** - extract common TTL/cleanup logic to avoid duplication

---

**Last Updated:** 2025-11-30
