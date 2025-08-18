import React, { useEffect, useState } from 'react';

interface DBInfo {
  logicalDatabase: string;
  physicalDatabases: string[];
  collections: string[];
}

export function DatabaseStructure({ dbName }: { dbName: string }) {
  const [dbInfo, setDbInfo] = useState<DBInfo | null>(null);
  
  useEffect(() => {
    async function checkStructure() {
      if (typeof window === 'undefined' || !('indexedDB' in window)) return;
      
      const databases = await indexedDB.databases();
      // RxDB uses pattern: rxdb-dexie-[dbname]--[version]--[collection]
      const dbPattern = `rxdb-dexie-${dbName}`;
      const ourDbs = databases
        .filter(db => db.name?.startsWith(dbPattern))
        .map(db => db.name || '');
      
      // Extract collection names from database names
      const collections = ourDbs
        .map(name => {
          const match = name.match(/--\d+--(.+)$/);
          return match ? match[1] : null;
        })
        .filter(name => name && name !== '_rxdb_internal') as string[];
      
      setDbInfo({
        logicalDatabase: dbName,
        physicalDatabases: ourDbs,
        collections
      });
    }
    
    checkStructure();
  }, [dbName]);
  
  if (!dbInfo) return null;
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-bold mb-2">🗂️ Database Structure</h4>
      
      <div className="mb-3">
        <div className="font-semibold text-green-700">Logical Database:</div>
        <div className="ml-4 text-sm">
          📦 {dbInfo.logicalDatabase}
        </div>
      </div>
      
      <div className="mb-3">
        <div className="font-semibold text-blue-700">Collections (Tables):</div>
        <div className="ml-4 text-sm space-y-1">
          {dbInfo.collections.map(col => (
            <div key={col}>📋 {col}</div>
          ))}
        </div>
      </div>
      
      <div>
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600">
            Technical Details (IndexedDB)
          </summary>
          <div className="mt-2 ml-4 space-y-1 text-gray-500">
            {dbInfo.physicalDatabases.map(db => (
              <div key={db}>💾 {db}</div>
            ))}
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded">
              Note: RxDB splits collections into separate IndexedDB databases for performance.
              This is an internal optimization - logically it's still one database!
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}