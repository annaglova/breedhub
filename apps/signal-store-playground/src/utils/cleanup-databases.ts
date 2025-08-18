/**
 * Utility to clean up old RxDB databases from IndexedDB
 */
export async function cleanupOldDatabases(keepPattern?: string) {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }

  try {
    const databases = await indexedDB.databases();
    let cleanedCount = 0;
    
    for (const db of databases) {
      if (!db.name) continue;
      
      // Clean up test databases (with rxdb-dexie prefix)
      const shouldDelete = 
        db.name.startsWith('rxdb-dexie-rxdb-demo-') ||
        db.name.startsWith('rxdb-dexie-phase1-demo-') ||
        db.name.startsWith('rxdb-dexie-rxdb-test-') ||
        db.name.startsWith('rxdb-demo-') || // old format
        db.name.startsWith('phase1-demo-') || // old format
        db.name.startsWith('_rxdb_internal');
      
      // Keep specific database if pattern provided
      if (shouldDelete && (!keepPattern || !db.name.includes(keepPattern))) {
        try {
          await indexedDB.deleteDatabase(db.name);
          console.log(`🗑️ Deleted database: ${db.name}`);
          cleanedCount++;
        } catch (e) {
          console.warn(`Failed to delete ${db.name}:`, e);
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} old databases`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning databases:', error);
    return 0;
  }
}

/**
 * Get list of all IndexedDB databases
 */
export async function listDatabases() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return [];
  }
  
  try {
    const databases = await indexedDB.databases();
    return databases.map(db => db.name).filter(Boolean);
  } catch (error) {
    console.error('Error listing databases:', error);
    return [];
  }
}

/**
 * Clean ALL RxDB related databases (use with caution!)
 */
export async function cleanAllRxDBDatabases() {
  const databases = await listDatabases();
  let cleaned = 0;
  
  for (const dbName of databases) {
    if (dbName && (
      dbName.includes('rxdb-dexie') || // RxDB with Dexie storage
      dbName.includes('rxdb') || 
      dbName.includes('phase') ||
      dbName.includes('breedhub') ||
      dbName.startsWith('_rxdb')
    )) {
      try {
        await indexedDB.deleteDatabase(dbName);
        console.log(`🗑️ Deleted: ${dbName}`);
        cleaned++;
      } catch (e) {
        console.warn(`Failed to delete ${dbName}:`, e);
      }
    }
  }
  
  console.log(`✨ Total cleaned: ${cleaned} databases`);
  return cleaned;
}