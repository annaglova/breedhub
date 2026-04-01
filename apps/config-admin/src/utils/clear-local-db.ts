/**
 * Utility to clear local IndexedDB database
 * Use this when schema changes and you need a fresh start
 */
export async function clearLocalDatabase() {
  try {
    // Get all database names - use fallback if databases() is not available
    let dbNames: string[] = [];
    
    if (indexedDB.databases) {
      const databases = await indexedDB.databases();
      dbNames = databases.map(db => db.name).filter(Boolean) as string[];
    } else {
      // Fallback for browsers that don't support databases()
      dbNames = [
        'breedhub',
        'rxdb-breedhub',
        '_rxdb_internal',
        'rxdb-dexie-breedhub'
      ];
    }
    
    // Add any additional known database names
    const knownDbs = [
      'breedhub',
      'rxdb-breedhub', 
      '_rxdb_internal',
      'rxdb-dexie-breedhub'
    ];
    
    const allDbs = [...new Set([...dbNames, ...knownDbs])];
    
    for (const dbName of allDbs) {
      if (dbName && (dbName.includes('breedhub') || dbName.includes('rxdb'))) {
        console.log(`Deleting database: ${dbName}`);
        try {
          await new Promise((resolve, reject) => {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = () => resolve(void 0);
            deleteReq.onerror = () => reject(deleteReq.error);
            deleteReq.onblocked = () => {
              console.log(`Database ${dbName} delete blocked`);
              resolve(void 0); // Continue anyway
            };
          });
        } catch (err) {
          console.error(`Failed to delete ${dbName}:`, err);
        }
      }
    }
    
    // Also clear localStorage for any RxDB related data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('rxdb') || key.includes('breedhub'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      console.log(`Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage too
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('rxdb') || key.includes('breedhub'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => {
      console.log(`Removing sessionStorage key: ${key}`);
      sessionStorage.removeItem(key);
    });
    
    console.log('Local database cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing local database:', error);
    return false;
  }
}

// Expose to window for manual clearing from console
if (typeof window !== 'undefined') {
  (window as any).clearLocalDatabase = clearLocalDatabase;
}