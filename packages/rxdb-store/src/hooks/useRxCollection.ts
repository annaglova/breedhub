/**
 * React hooks for RxDB integration
 * Based on official RxDB React example
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  RxCollection, 
  RxDocument, 
  RxDatabase,
  RxQuery,
  MangoQuery
} from 'rxdb';
import { databaseService } from '../services/database.service';

/**
 * Generic hook for reactive RxDB queries
 * Automatically subscribes to collection changes
 */
export function useRxData<T>(
  collection: RxCollection<T> | undefined,
  query: MangoQuery<T> = {}
) {
  const [data, setData] = useState<RxDocument<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!collection) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Create reactive query
    const rxQuery: RxQuery<T> = collection.find(query);
    
    // Subscribe to query results
    const subscription = rxQuery.$.subscribe({
      next: (documents) => {
        setData(documents);
        setLoading(false);
      },
      error: (err) => {
        console.error('RxDB query error:', err);
        setError(err);
        setLoading(false);
      }
    });
    
    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, [collection, JSON.stringify(query)]);
  
  return { data, loading, error };
}

/**
 * Hook for accessing RxDB database
 */
export function useRxDB() {
  const [db, setDb] = useState<RxDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    databaseService.getDatabase()
      .then(database => {
        setDb(database);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to initialize database:', err);
        setError(err);
        setLoading(false);
      });
  }, []);
  
  return { db, loading, error };
}

/**
 * Hook for single document subscription
 */
export function useRxDocument<T>(
  collection: RxCollection<T> | undefined,
  id: string
) {
  const [document, setDocument] = useState<RxDocument<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!collection || !id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Find document and subscribe to changes
    const subscription = collection
      .findOne(id)
      .$.subscribe({
        next: (doc) => {
          setDocument(doc);
          setLoading(false);
        },
        error: (err) => {
          console.error('Document fetch error:', err);
          setError(err);
          setLoading(false);
        }
      });
    
    return () => subscription.unsubscribe();
  }, [collection, id]);
  
  return { document, loading, error };
}

/**
 * Hook for collection with CRUD operations
 */
export function useRxCollection<T>(collectionName: string) {
  const { db, loading: dbLoading, error: dbError } = useRxDB();
  const [collection, setCollection] = useState<RxCollection<T> | null>(null);
  
  useEffect(() => {
    if (db && collectionName in db) {
      setCollection(db[collectionName]);
    }
  }, [db, collectionName]);
  
  // CRUD operations
  const insert = useCallback(async (document: T) => {
    if (!collection) throw new Error('Collection not ready');
    return await collection.insert(document);
  }, [collection]);
  
  const update = useCallback(async (id: string, changes: Partial<T>) => {
    if (!collection) throw new Error('Collection not ready');
    const doc = await collection.findOne(id).exec();
    if (!doc) throw new Error(`Document ${id} not found`);
    return await doc.patch(changes);
  }, [collection]);
  
  const remove = useCallback(async (id: string) => {
    if (!collection) throw new Error('Collection not ready');
    const doc = await collection.findOne(id).exec();
    if (!doc) throw new Error(`Document ${id} not found`);
    return await doc.remove();
  }, [collection]);
  
  const upsert = useCallback(async (document: T) => {
    if (!collection) throw new Error('Collection not ready');
    return await collection.upsert(document);
  }, [collection]);
  
  const bulkInsert = useCallback(async (documents: T[]) => {
    if (!collection) throw new Error('Collection not ready');
    return await collection.bulkInsert(documents);
  }, [collection]);
  
  return {
    collection,
    loading: dbLoading,
    error: dbError,
    // CRUD operations
    insert,
    update,
    remove,
    upsert,
    bulkInsert
  };
}

/**
 * Hook for sync status monitoring
 */
export function useReplicationState(replicationState: any) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(0);
  
  useEffect(() => {
    if (!replicationState) return;
    
    // Subscribe to replication state changes
    const activeSub = replicationState.active$.subscribe(setActive);
    const errorSub = replicationState.error$.subscribe(setError);
    
    // Monitor pending changes
    const pendingSub = replicationState.pending$.subscribe(setPending);
    
    return () => {
      activeSub.unsubscribe();
      errorSub.unsubscribe();
      pendingSub.unsubscribe();
    };
  }, [replicationState]);
  
  return {
    active,
    error,
    pending,
    isOnline: active && !error,
    isSyncing: active && pending > 0
  };
}

/**
 * Hook for offline queue monitoring
 */
export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // TODO: Connect to actual offline queue when implemented
  
  return {
    queueSize,
    isOnline,
    hasOfflineChanges: queueSize > 0
  };
}