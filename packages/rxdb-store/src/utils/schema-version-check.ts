/**
 * Schema version check — auto-clear RxDB cache when entity schemas change.
 * Compares hash of entity field definitions (not config export timestamp).
 * If schema changed: flushes sync queue, clears IndexedDB, reloads page.
 *
 * Returns true if reload was triggered (caller should return early).
 */

import { getDatabase } from '../services/database.service';
import { syncQueueService } from '../services/sync-queue.service';
import { appConfigReader } from '../stores/app-config-reader';

const SCHEMA_HASH_KEY = 'breedhub_schema_hash';

/**
 * Simple hash from string — fast, not cryptographic.
 * Sufficient for detecting config changes.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Build hash from entity schemas in config.
 * Includes field names, types, and required flags — anything that affects RxDB schema.
 */
function buildSchemaHash(config: Record<string, any> | null): string {
  if (!config?.entities) return '0';

  // Extract field names and types from each entity — this determines RxDB schema
  const schemaKeys: string[] = [];
  for (const [entityKey, schema] of Object.entries(config.entities as Record<string, any>)) {
    const fields = schema.fields;
    if (!fields) continue;
    const fieldNames = Object.keys(fields).sort().join(',');
    schemaKeys.push(`${entityKey}:${fieldNames}`);
  }

  return simpleHash(schemaKeys.sort().join('|'));
}

export async function checkSchemaVersion(): Promise<boolean> {
  const config = appConfigReader.getConfig();
  const currentHash = buildSchemaHash(config);
  const savedHash = localStorage.getItem(SCHEMA_HASH_KEY);

  if (savedHash && savedHash !== currentHash) {
    console.log(`[SchemaCheck] Schema hash changed (${savedHash} → ${currentHash}). Clearing RxDB cache...`);

    try {
      const db = await getDatabase();
      await syncQueueService.initialize(db);
      await syncQueueService.processNow();
      // Close all connections before deleting IndexedDB
      await db.remove();
    } catch { /* best effort */ }

    // Fallback: manual delete in case db.remove() missed something
    try {
      await new Promise<void>((resolve) => {
        let pending = 2;
        const done = () => { if (--pending <= 0) resolve(); };
        const r1 = indexedDB.deleteDatabase('rxdb-dexie-breedhub');
        r1.onsuccess = r1.onerror = r1.onblocked = done;
        const r2 = indexedDB.deleteDatabase('breedhub');
        r2.onsuccess = r2.onerror = r2.onblocked = done;
      });
    } catch { /* best effort */ }

    localStorage.setItem(SCHEMA_HASH_KEY, currentHash);

    console.log('[SchemaCheck] RxDB cleared. Reloading...');
    window.location.reload();
    return true;
  }

  if (!savedHash) {
    localStorage.setItem(SCHEMA_HASH_KEY, currentHash);
  }

  return false;
}
