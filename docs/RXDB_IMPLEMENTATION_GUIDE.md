# 🚀 RxDB Implementation Guide for BreedHub

> На основі офіційних прикладів RxDB з Supabase та React

## 📚 Корисні ресурси

- [RxDB Supabase Example](https://github.com/pubkey/rxdb/tree/master/examples/supabase)
- [RxDB React Example](https://github.com/pubkey/rxdb/tree/master/examples/react)
- [Наш поточний RxDB код](../packages/rxdb-store/)

## 🎯 Ключові патерни для впровадження

### 1. Database Singleton Pattern (з React прикладу)

**Замість поточного підходу:**
```typescript
// packages/rxdb-store/src/database.ts - CURRENT
export const initDatabase = async () => {
  const db = await createRxDatabase({...});
  return db;
};
```

**Використати Lazy Singleton:**
```typescript
// packages/rxdb-store/src/database.ts - IMPROVED
class DatabaseManager {
  private static dbPromise: Promise<RxDatabase> | null = null;
  
  static async get(): Promise<RxDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.createDatabase();
    }
    return this.dbPromise;
  }
  
  private static async createDatabase() {
    const db = await createRxDatabase({
      name: 'breedhub',
      storage: getRxStorageDexie(),
      multiInstance: true,
      eventReduce: true,
      cleanupPolicy: {
        minimumDeletedTime: 1000 * 60 * 60 * 24 * 7, // 7 days
        minimumCollectionAge: 1000 * 60 * 60 * 24,   // 1 day
        runEach: 1000 * 60 * 60 * 4                   // 4 hours
      }
    });
    
    // Add plugins
    if (process.env.NODE_ENV === 'development') {
      await import('rxdb/plugins/dev-mode').then(module => 
        addRxPlugin(module.RxDBDevModePlugin)
      );
    }
    
    // Add collections
    await db.addCollections({
      breeds: { schema: breedSchema },
      pets: { schema: petSchema },
      kennels: { schema: kennelSchema },
      litters: { schema: litterSchema }
    });
    
    return db;
  }
}

export const getDatabase = DatabaseManager.get;
```

### 2. Supabase Replication Pattern (з Supabase прикладу)

**Покращена реплікація з conflict resolution:**
```typescript
// packages/rxdb-store/src/replication/supabase-replication.ts
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { lastOfArray } from 'rxdb/plugins/core';

export function setupSupabaseReplication(
  collection: RxCollection,
  supabaseClient: SupabaseClient,
  tableName: string
) {
  const replicationState = replicateRxCollection({
    collection,
    replicationIdentifier: `${tableName}-supabase-replication`,
    
    // PULL - отримання даних з Supabase
    pull: {
      async handler(checkpoint, batchSize) {
        const lastCheckpoint = checkpoint?.updated_at || '1970-01-01T00:00:00.000Z';
        
        const { data, error } = await supabaseClient
          .from(tableName)
          .select('*')
          .gt('updated_at', lastCheckpoint)
          .order('updated_at', { ascending: true })
          .limit(batchSize);
        
        if (error) throw error;
        
        // Transform Supabase data to RxDB format
        const documents = data.map(doc => ({
          ...doc,
          _id: doc.id,
          _rev: doc.replicationRevision || generateRevision(doc),
          _deleted: doc.deleted || false
        }));
        
        const newCheckpoint = lastOfArray(data)
          ? { updated_at: lastOfArray(data).updated_at }
          : checkpoint;
        
        return {
          documents,
          checkpoint: newCheckpoint
        };
      },
      batchSize: 50,
      modifier: doc => doc // можна трансформувати дані
    },
    
    // PUSH - відправка даних в Supabase
    push: {
      async handler(changeRows) {
        const conflicts = [];
        
        for (const row of changeRows) {
          const doc = row.newDocumentState;
          
          // Prepare document for Supabase
          const supabaseDoc = {
            id: doc._id,
            ...doc,
            updated_at: new Date().toISOString(),
            replicationRevision: generateRevision(doc)
          };
          
          // Remove RxDB specific fields
          delete supabaseDoc._id;
          delete supabaseDoc._rev;
          delete supabaseDoc._attachments;
          delete supabaseDoc._deleted;
          
          // Upsert to Supabase
          const { data, error } = await supabaseClient
            .from(tableName)
            .upsert(supabaseDoc, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select()
            .single();
          
          if (error) {
            // Handle conflict
            const conflictDoc = await supabaseClient
              .from(tableName)
              .select('*')
              .eq('id', doc._id)
              .single();
            
            if (conflictDoc.data) {
              conflicts.push({
                assumedMasterState: doc,
                realMasterState: conflictDoc.data
              });
            }
          }
        }
        
        return conflicts;
      },
      batchSize: 10,
      modifier: doc => doc
    },
    
    // CONFLICT RESOLUTION
    conflictHandler: {
      isEqual(a, b) {
        return a.replicationRevision === b.replicationRevision;
      },
      
      async resolve(conflict) {
        // Strategy: Last-Write-Wins with smart merging
        const local = conflict.assumedMasterState;
        const remote = conflict.realMasterState;
        
        // If remote is newer, use it
        if (new Date(remote.updated_at) > new Date(local.updated_at)) {
          return remote;
        }
        
        // If local is newer, keep local changes
        return local;
      }
    },
    
    // LIVE SYNC
    live: true,
    liveInterval: 10000, // 10 seconds
    retryTime: 5000,     // 5 seconds retry on error
    
    // AUTO START
    autoStart: true
  });
  
  // Monitor replication state
  replicationState.error$.subscribe(error => {
    console.error('Replication error:', error);
  });
  
  replicationState.active$.subscribe(active => {
    console.log('Replication active:', active);
  });
  
  return replicationState;
}

// Helper function to generate revision hash
function generateRevision(doc: any): string {
  const content = JSON.stringify(doc);
  return btoa(content).substring(0, 10);
}
```

### 3. React Hooks Pattern (з React прикладу)

**Reactive hooks для RxDB:**
```typescript
// packages/rxdb-store/src/hooks/useRxCollection.ts
import { useState, useEffect } from 'react';
import { RxCollection, RxQuery, RxDocument } from 'rxdb';

export function useRxData<T>(
  collection: RxCollection<T>,
  query?: any
) {
  const [data, setData] = useState<RxDocument<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!collection) {
      setLoading(false);
      return;
    }
    
    const rxQuery = collection.find(query || {});
    
    const subscription = rxQuery.$.subscribe({
      next: (results) => {
        setData(results);
        setLoading(false);
        setError(null);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [collection, JSON.stringify(query)]);
  
  return { data, loading, error };
}

// Specialized hook for breeds
export function useBreeds(filters?: any) {
  const [db, setDb] = useState<RxDatabase | null>(null);
  
  useEffect(() => {
    getDatabase().then(setDb);
  }, []);
  
  const query = filters ? { selector: filters } : {};
  const { data, loading, error } = useRxData(
    db?.breeds,
    query
  );
  
  const addBreed = async (breed: Breed) => {
    if (!db) return;
    await db.breeds.insert(breed);
  };
  
  const updateBreed = async (id: string, changes: Partial<Breed>) => {
    if (!db) return;
    const doc = await db.breeds.findOne(id).exec();
    if (doc) await doc.patch(changes);
  };
  
  const deleteBreed = async (id: string) => {
    if (!db) return;
    const doc = await db.breeds.findOne(id).exec();
    if (doc) await doc.remove();
  };
  
  return {
    breeds: data,
    loading,
    error,
    addBreed,
    updateBreed,
    deleteBreed
  };
}
```

### 4. Schema Definition Pattern (Best Practices)

**Правильна структура схеми для RxDB:**
```typescript
// packages/rxdb-store/src/schemas/breed.schema.ts
export const breedSchemaLiteral = {
  title: 'breed schema',
  description: 'Schema for dog breeds',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string',
      maxLength: 200,
      final: false // можна змінювати
    },
    description: {
      type: 'string',
      maxLength: 2000
    },
    origin: {
      type: 'string',
      maxLength: 100
    },
    traits: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 50
      },
      default: []
    },
    // Metadata fields
    created_at: {
      type: 'string',
      format: 'date-time'
    },
    updated_at: {
      type: 'string',
      format: 'date-time'
    },
    created_by: {
      type: 'string',
      ref: 'users' // reference to users collection
    },
    // Replication fields
    replicationRevision: {
      type: 'string'
    },
    deleted: {
      type: 'boolean',
      default: false
    }
  },
  required: ['id', 'name', 'created_at', 'updated_at'],
  indexes: [
    'name',
    'origin',
    'updated_at',
    ['origin', 'name'] // compound index
  ],
  attachments: {
    encrypted: false
  }
} as const;

// TypeScript type from schema
export type BreedDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof breedSchemaLiteral
>;

export const breedSchema: RxJsonSchema<BreedDocType> = breedSchemaLiteral;
```

### 5. Migration Strategy

**Поетапна міграція з Dexie на RxDB:**
```typescript
// packages/rxdb-store/src/migration/dexie-to-rxdb.ts
export async function migrateDexieToRxDB() {
  // 1. Export from Dexie
  const dexieDb = new Dexie('dogarray');
  const breeds = await dexieDb.table('breeds').toArray();
  const pets = await dexieDb.table('pets').toArray();
  
  // 2. Import to RxDB
  const rxdb = await getDatabase();
  
  // Batch insert with progress
  const batchSize = 100;
  for (let i = 0; i < breeds.length; i += batchSize) {
    const batch = breeds.slice(i, i + batchSize);
    await rxdb.breeds.bulkInsert(batch);
    console.log(`Migrated ${i + batch.length}/${breeds.length} breeds`);
  }
  
  // 3. Verify migration
  const rxdbCount = await rxdb.breeds.count().exec();
  console.log(`Migration complete: ${rxdbCount} breeds in RxDB`);
  
  // 4. Clean up old Dexie database (optional)
  // await dexieDb.delete();
}
```

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Implement DatabaseManager singleton
- [ ] Create proper RxDB schemas for all entities
- [ ] Setup development plugins (DevMode, Validation)
- [ ] Create migration script from Dexie

### Phase 2: Replication (Week 2)
- [ ] Implement Supabase pull handler
- [ ] Implement Supabase push handler
- [ ] Add conflict resolution logic
- [ ] Setup real-time sync subscriptions
- [ ] Add offline queue for failed syncs

### Phase 3: React Integration (Week 3)
- [ ] Create useRxData hook
- [ ] Create entity-specific hooks (useBreeds, usePets, etc.)
- [ ] Update all components to use reactive queries
- [ ] Add loading and error states
- [ ] Implement optimistic UI updates

### Phase 4: Advanced Features (Week 4)
- [ ] Add attachment support for images
- [ ] Implement full-text search
- [ ] Add query caching and optimization
- [ ] Setup leader election for tabs
- [ ] Add encryption for sensitive data

### Phase 5: Testing & Optimization (Week 5)
- [ ] Unit tests for replication logic
- [ ] Integration tests for offline/online scenarios
- [ ] Performance testing with large datasets
- [ ] Conflict resolution testing
- [ ] User acceptance testing

## 🎯 Success Metrics

- **Sync latency:** < 1 second for small changes
- **Offline capability:** 100% functionality without network
- **Conflict resolution:** 95%+ automatic resolution
- **Performance:** < 100ms query response time
- **Bundle size:** < 200KB for RxDB + plugins

## 🔗 Next Steps

1. Start with DatabaseManager implementation
2. Test in playground first
3. Gradually migrate components
4. Monitor performance and sync status
5. Add user feedback for conflicts

Ця стратегія базується на офіційних прикладах RxDB та адаптована для BreedHub!