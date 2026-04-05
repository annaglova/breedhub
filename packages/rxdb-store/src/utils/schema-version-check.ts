/**
 * Schema version check — auto-clear RxDB cache when config version changes.
 * Call before creating RxDB collections. If version mismatch detected:
 * flushes sync queue, clears IndexedDB, reloads page.
 *
 * Returns true if reload was triggered (caller should return early).
 */

import { getDatabase } from '../services/database.service';
import { syncQueueService } from '../services/sync-queue.service';
import { appConfigReader } from '../stores/app-config-reader';

const SCHEMA_VERSION_KEY = 'breedhub_schema_version';

export async function checkSchemaVersion(): Promise<boolean> {
  const configVersion = String(appConfigReader.getVersion());
  const savedVersion = localStorage.getItem(SCHEMA_VERSION_KEY);

  if (savedVersion && savedVersion !== configVersion) {
    console.log(`[SchemaCheck] Version changed (${savedVersion} → ${configVersion}). Clearing RxDB cache...`);

    try {
      const db = await getDatabase();
      await syncQueueService.initialize(db);
      await syncQueueService.processNow();
    } catch { /* best effort */ }

    indexedDB.deleteDatabase('rxdb-dexie-breedhub');
    indexedDB.deleteDatabase('breedhub');
    localStorage.setItem(SCHEMA_VERSION_KEY, configVersion);

    console.log('[SchemaCheck] RxDB cleared. Reloading...');
    window.location.reload();
    return true;
  }

  if (!savedVersion) {
    localStorage.setItem(SCHEMA_VERSION_KEY, configVersion);
  }

  return false;
}
