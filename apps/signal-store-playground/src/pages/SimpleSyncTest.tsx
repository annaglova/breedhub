import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Check, AlertCircle, Trash2 } from 'lucide-react';
import { getTempDatabase, destroyTempDatabase } from '@breedhub/rxdb-store/src/temp-database';
import { supabase } from '@breedhub/rxdb-store/src/supabase/client';
import { COLLECTIONS } from '@breedhub/rxdb-store/src/supabase/collections-config';
import { testSchemaFetch } from '@breedhub/rxdb-store/src/supabase/fetch-schema';

export default function SimpleSyncTest() {
  const [status, setStatus] = useState<string>('ready');
  const [breeds, setBreeds] = useState<any[]>([]);
  const [rxdbBreeds, setRxdbBreeds] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  // Test schema fetching
  const testFetchSchema = async () => {
    addLog('Testing schema fetch...');
    const schemas = await testSchemaFetch();
    addLog(`Fetched schemas: ${JSON.stringify(schemas, null, 2)}`);
  };

  // Load breeds from Supabase
  const loadBreeds = async () => {
    setStatus('loading');
    try {
      // Load only essential fields first to avoid issues
      const { data, error } = await supabase
        .from('breed')
        .select('id, name, admin_name, url, created_on, modified_on')
        .limit(5); // Start with just 5 for testing
      
      if (error) {
        addLog(`Error loading breeds: ${error.message}`);
        return;
      }
      
      setBreeds(data || []);
      addLog(`Loaded ${data?.length || 0} breeds from Supabase`);
      console.log('Loaded breeds:', data);
    } catch (error: any) {
      addLog(`Failed to load breeds: ${error.message}`);
    } finally {
      setStatus('ready');
    }
  };

  // Load breeds from RxDB
  const loadRxDBBreeds = async () => {
    try {
      const db = await getTempDatabase();
      if (db.collections.breed) {
        const data = await db.collections.breed.find().exec();
        setRxdbBreeds(data.map((doc: any) => doc.toJSON()));
        addLog(`Found ${data.length} breeds in RxDB`);
      } else {
        addLog('Breed collection not found in RxDB');
      }
    } catch (error: any) {
      addLog(`Failed to load from RxDB: ${error.message}`);
    }
  };

  // Clear database
  const clearDatabase = async () => {
    try {
      addLog('Destroying database...');
      await destroyTempDatabase();
      setRxdbBreeds([]);
      addLog('Database destroyed. Will create fresh one on next sync.');
    } catch (error: any) {
      addLog(`Failed to clear database: ${error.message}`);
    }
  };

  // Sync to RxDB
  const syncToRxDB = async () => {
    setStatus('syncing');
    try {
      addLog('Getting fresh database...');
      const db = await getTempDatabase();
      
      // Always create collection fresh
      if (!db.collections.breed) {
        addLog('Adding breed collection...');
        try {
          await db.addCollections({
            breed: { schema: COLLECTIONS.breed }
          });
          addLog('Breed collection added successfully');
        } catch (colError: any) {
          addLog(`Collection error: ${colError.message}`);
          return;
        }
      } else {
        addLog('Breed collection already exists');
      }
      
      // Sync breeds one by one to identify issues
      if (breeds.length > 0) {
        addLog(`Starting sync of ${breeds.length} breeds...`);
        
        for (let i = 0; i < breeds.length; i++) {
          const breed = breeds[i];
          try {
            // Clean up data before sync
            const cleanBreed = {
              id: breed.id || `breed_${i}`,
              name: breed.name || 'Unknown',
              admin_name: breed.admin_name || '',
              url: breed.url || '',
              created_on: breed.created_on || new Date().toISOString(),
              modified_on: breed.modified_on || new Date().toISOString()
            };
            
            await db.collections.breed.upsert(cleanBreed);
            addLog(`✓ Synced breed ${i + 1}/${breeds.length}: ${cleanBreed.name}`);
          } catch (breedError: any) {
            addLog(`✗ Failed breed ${i + 1}: ${breedError.message}`);
            console.error('Breed sync error:', breedError, breed);
          }
        }
        
        addLog(`Sync complete!`);
      }
      
      // Verify data in RxDB
      await loadRxDBBreeds();
      
    } catch (error: any) {
      addLog(`Sync failed: ${error.message}`);
      console.error('Full sync error:', error);
    } finally {
      setStatus('ready');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Database className="w-8 h-8" />
            Simple Sync Test
          </h1>
          <p className="text-lg text-gray-600">
            Test basic sync between Supabase and RxDB
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          
          <div className="flex gap-3 mb-4">
            <button
              onClick={testFetchSchema}
              disabled={status !== 'ready'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Test Schema Fetch
            </button>
            
            <button
              onClick={loadBreeds}
              disabled={status !== 'ready'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              Load Breeds
            </button>
            
            <button
              onClick={syncToRxDB}
              disabled={status !== 'ready' || breeds.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Sync to RxDB
            </button>
            
            <button
              onClick={loadRxDBBreeds}
              disabled={status !== 'ready'}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300"
            >
              Load from RxDB
            </button>
            
            <button
              onClick={clearDatabase}
              disabled={status !== 'ready'}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Clear DB
            </button>
          </div>

          {/* Status */}
          <div className="mb-4">
            <span className="text-sm text-gray-600">Status: </span>
            <span className={`text-sm font-semibold ${
              status === 'ready' ? 'text-green-600' : 
              status === 'loading' ? 'text-blue-600' : 
              'text-yellow-600'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* Data Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supabase Breeds */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Supabase Breeds ({breeds.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {breeds.slice(0, 5).map(breed => (
                <div 
                  key={breed.id}
                  className="p-3 bg-gray-50 rounded"
                >
                  <div className="font-medium">{breed.name}</div>
                  <div className="text-sm text-gray-600">
                    {breed.admin_name && `Admin: ${breed.admin_name}`}
                  </div>
                  {breed.url && (
                    <div className="text-xs text-blue-600 truncate">{breed.url}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">ID: {breed.id}</div>
                </div>
              ))}
              {breeds.length > 5 && (
                <div className="text-sm text-gray-500 p-2">...and {breeds.length - 5} more</div>
              )}
            </div>
          </div>

          {/* RxDB Breeds */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">RxDB Breeds ({rxdbBreeds.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rxdbBreeds.slice(0, 5).map(breed => (
                <div key={breed.id} className="p-3 bg-green-50 rounded">
                  <div className="font-medium">{breed.name}</div>
                  <div className="text-sm text-gray-600">
                    {breed.admin_name && `Admin: ${breed.admin_name}`}
                  </div>
                  {breed.url && (
                    <div className="text-xs text-blue-600 truncate">{breed.url}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">ID: {breed.id}</div>
                </div>
              ))}
              {rxdbBreeds.length > 5 && (
                <div className="text-sm text-gray-500 p-2">...and {rxdbBreeds.length - 5} more</div>
              )}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Logs:</h3>
          <div className="text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}