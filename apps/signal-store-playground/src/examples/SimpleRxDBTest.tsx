import React, { useEffect, useState, useRef } from 'react';
import { createRxDatabase, removeRxDatabase, dbExists } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { addRxPlugin } from 'rxdb';

// Add plugins
addRxPlugin(RxDBQueryBuilderPlugin);

// Global database instance to avoid DB9 errors
let globalDb: any = null;

// Simple schema
const simpleSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object' as const,
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    createdAt: { type: 'string' }
  },
  required: ['id', 'name', 'createdAt']
};

export function SimpleRxDBTest() {
  const [status, setStatus] = useState('Initializing...');
  const [items, setItems] = useState<any[]>([]);
  const [db, setDb] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    
    async function init() {
      try {
        setInitialized(true);
        
        // Use global database if already exists
        if (globalDb) {
          console.log('Using existing global database');
          setDb(globalDb);
          setStatus('✅ Database ready!');
          
          // Subscribe to changes
          const subscription = globalDb.items.find().$.subscribe((docs: any[]) => {
            setItems(docs);
          });
          
          return () => {
            subscription.unsubscribe();
          };
        }
        
        setStatus('Cleaning up...');
        
        setStatus('Checking database...');
        
        // Use stable name for Phase 0 demo
        const uniqueName = `phase0-stable-demo`;
        
        console.log(`Creating fresh database: ${uniqueName}`);
        
        // Clean up old test databases but keep stable ones
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          try {
            const databases = await indexedDB.databases();
            for (const db of databases) {
              if (db.name?.startsWith('rxdb-demo-')) {
                console.log(`🗑️ Removing old: ${db.name}`);
                await indexedDB.deleteDatabase(db.name);
              }
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
        setStatus('Creating database...');
        
        let database;
        try {
          // Try to reuse existing database first
          database = await createRxDatabase({
            name: uniqueName,
            storage: getRxStorageDexie(),
            ignoreDuplicate: true, // Reuse if exists
            multiInstance: false,
            allowSlowCount: true
          });
        } catch (err: any) {
          // If that fails, remove and recreate
          console.log('Database error, removing and recreating...');
          const { removeRxDatabase } = await import('rxdb');
          await removeRxDatabase(uniqueName, getRxStorageDexie());
          
          database = await createRxDatabase({
            name: uniqueName,
            storage: getRxStorageDexie(),
            ignoreDuplicate: false,
            multiInstance: false,
            allowSlowCount: true
          });
        }

        setStatus('Adding collection...');
        
        await database.addCollections({
          items: {
            schema: simpleSchema
          }
        });

        // Save to global
        globalDb = database;
        setDb(database);
        setStatus('✅ Database ready!');

        // Check if test item already exists before adding
        const existingItem = await database.items.findOne('test-1').exec();
        if (!existingItem) {
          await database.items.insert({
            id: 'test-1',
            name: 'Test Item',
            createdAt: new Date().toISOString()
          });
        }

        // Subscribe to changes
        const subscription = database.items.find().$.subscribe((docs: any[]) => {
          setItems(docs);
        });

        return () => {
          subscription.unsubscribe();
          database.destroy();
        };

      } catch (error: any) {
        console.error('RxDB Error:', error);
        setStatus(`❌ Error: ${error.message}`);
      }
    }

    init();
  }, []);

  const addItem = async () => {
    if (!db) return;
    
    try {
      await db.items.insert({
        id: `item-${Date.now()}`,
        name: `Item ${Date.now()}`,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Insert error:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">🧪 Simple RxDB Test</h2>
      
      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>
      
      <button 
        onClick={addItem}
        disabled={!db}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 mb-4"
      >
        Add Item
      </button>
      
      <div>
        <strong>Items ({items.length}):</strong>
        <ul className="list-disc list-inside mt-2">
          {items.map(item => (
            <li key={item.id}>
              {item.name} - {item.createdAt}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}