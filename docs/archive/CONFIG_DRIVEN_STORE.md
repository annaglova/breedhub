# 🎯 Config-Driven Store Architecture для BreedHub

> Як динамічно генерувати RxDB collections та React hooks з конфігурацій Supabase

## 📊 Загальна концепція

### Що таке Config-Driven Architecture?

Замість хардкоду схем та сторів, вони генеруються динамічно з конфігурацій, що зберігаються в Supabase:

```
Supabase app_config → ConfigLoader → RxDB Collections → React Hooks → UI
         ↓                  ↓              ↓                ↓           ↓
    JSON configs      Parse & Cache   Auto-generate    useBreeds()  <BreedsPage/>
```

## 🗄️ Структура конфігів в Supabase

### Таблиця app_config (вже існує!)

```sql
-- Конфіги вже зберігаються тут
SELECT * FROM app_config WHERE key LIKE '%_collection_config';

-- Приклад конфігу для breeds collection:
{
  "key": "breeds_collection_config",
  "base_config": {
    "collection_name": "breeds",
    "entity_type": "breed",
    "schema": {
      "version": 0,
      "primaryKey": "id",
      "properties": {
        "id": {"type": "string", "maxLength": 100},
        "name": {"type": "string", "required": true},
        "origin": {"type": "string"},
        "traits": {"type": "array", "items": {"type": "string"}}
      },
      "indexes": ["name", "origin", "updated_at"]
    },
    "sync": {
      "enabled": true,
      "table": "breed",
      "batchSize": 50
    },
    "ui": {
      "icon": "🐕",
      "listColumns": ["name", "origin", "traits"],
      "searchFields": ["name", "description"]
    }
  }
}
```

## 🚀 Імплементація для React + RxDB

### 1. ConfigLoader Service

```typescript
// packages/rxdb-store/src/services/config-loader.ts
import { supabase } from '@/lib/supabase';

export interface CollectionConfig {
  collection_name: string;
  entity_type: string;
  schema: RxJsonSchema;
  sync?: {
    enabled: boolean;
    table: string;
    batchSize?: number;
  };
  ui?: {
    icon?: string;
    listColumns?: string[];
    searchFields?: string[];
  };
  computed?: {
    [key: string]: (doc: any) => any;
  };
}

export class ConfigLoaderService {
  private static instance: ConfigLoaderService;
  private configs = new Map<string, CollectionConfig>();
  private loadPromise: Promise<CollectionConfig[]> | null = null;
  
  static getInstance(): ConfigLoaderService {
    if (!this.instance) {
      this.instance = new ConfigLoaderService();
    }
    return this.instance;
  }
  
  async loadConfigs(): Promise<CollectionConfig[]> {
    // Cache the promise to avoid multiple loads
    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = this._loadConfigs();
    return this.loadPromise;
  }
  
  private async _loadConfigs(): Promise<CollectionConfig[]> {
    // 1. Load from Supabase
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .like('key', '%_collection_config')
      .eq('is_active', true);
    
    if (error) throw error;
    
    // 2. Parse configs
    const configs = data.map(row => {
      const config = row.base_config || row.computed_config;
      return {
        ...config,
        _id: row.id,
        _key: row.key
      } as CollectionConfig;
    });
    
    // 3. Cache in memory
    configs.forEach(config => {
      this.configs.set(config.collection_name, config);
    });
    
    // 4. Cache in IndexedDB for offline
    await this.cacheToIndexedDB(configs);
    
    // 5. Subscribe to real-time updates
    this.subscribeToChanges();
    
    return configs;
  }
  
  private async cacheToIndexedDB(configs: CollectionConfig[]) {
    const db = await openDB('config-cache', 1, {
      upgrade(db) {
        db.createObjectStore('configs');
      }
    });
    
    await db.put('configs', configs, 'collection-configs');
  }
  
  private subscribeToChanges() {
    supabase
      .channel('config-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_config',
        filter: 'key=like.*_collection_config'
      }, (payload) => {
        console.log('Config changed:', payload);
        // Reload configs
        this.loadConfigs();
      })
      .subscribe();
  }
  
  getConfig(collectionName: string): CollectionConfig | undefined {
    return this.configs.get(collectionName);
  }
  
  getAllConfigs(): CollectionConfig[] {
    return Array.from(this.configs.values());
  }
}
```

### 2. Dynamic RxDB Database Creation

```typescript
// packages/rxdb-store/src/database/dynamic-database.ts
import { createRxDatabase, RxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { ConfigLoaderService } from '../services/config-loader';

export class DynamicDatabaseManager {
  private static dbPromise: Promise<RxDatabase> | null = null;
  
  static async getDatabase(): Promise<RxDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.createDatabase();
    }
    return this.dbPromise;
  }
  
  private static async createDatabase(): Promise<RxDatabase> {
    // 1. Load configs from Supabase
    const configLoader = ConfigLoaderService.getInstance();
    const configs = await configLoader.loadConfigs();
    
    // 2. Create RxDB database
    const db = await createRxDatabase({
      name: 'breedhub-dynamic',
      storage: getRxStorageDexie(),
      multiInstance: true,
      eventReduce: true
    });
    
    // 3. Create collections from configs
    const collections: any = {};
    
    for (const config of configs) {
      collections[config.collection_name] = {
        schema: config.schema,
        methods: this.generateMethods(config),
        statics: this.generateStatics(config)
      };
    }
    
    await db.addCollections(collections);
    
    // 4. Setup Supabase sync for each collection
    for (const config of configs) {
      if (config.sync?.enabled) {
        await this.setupSync(db[config.collection_name], config);
      }
    }
    
    return db;
  }
  
  private static generateMethods(config: CollectionConfig) {
    // Generate document methods
    return {
      // Computed fields
      ...Object.entries(config.computed || {}).reduce((acc, [key, fn]) => ({
        ...acc,
        [`get${key.charAt(0).toUpperCase() + key.slice(1)}`]: fn
      }), {}),
      
      // Default methods
      toDisplay() {
        return this.name || this.id;
      }
    };
  }
  
  private static generateStatics(config: CollectionConfig) {
    // Generate collection static methods
    return {
      async findByName(name: string) {
        return this.findOne({ selector: { name } }).exec();
      },
      
      async search(term: string) {
        const searchFields = config.ui?.searchFields || ['name'];
        const selector = {
          $or: searchFields.map(field => ({
            [field]: { $regex: `.*${term}.*`, $options: 'i' }
          }))
        };
        return this.find({ selector }).exec();
      }
    };
  }
  
  private static async setupSync(collection: RxCollection, config: CollectionConfig) {
    const { setupSupabaseReplication } = await import('../replication/supabase-replication');
    
    return setupSupabaseReplication(
      collection,
      supabase,
      config.sync!.table,
      {
        batchSize: config.sync!.batchSize || 50,
        live: true,
        retry: true
      }
    );
  }
}
```

### 3. Dynamic React Hooks Generation

```typescript
// packages/rxdb-store/src/hooks/useDynamicCollection.ts
import { useState, useEffect, useMemo } from 'react';
import { DynamicDatabaseManager } from '../database/dynamic-database';
import { ConfigLoaderService } from '../services/config-loader';

/**
 * Universal hook for any collection based on config
 */
export function useDynamicCollection(collectionName: string) {
  const [db, setDb] = useState<RxDatabase | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Get config for this collection
  const config = useMemo(() => {
    return ConfigLoaderService.getInstance().getConfig(collectionName);
  }, [collectionName]);
  
  useEffect(() => {
    let subscription: any;
    
    async function init() {
      try {
        setLoading(true);
        
        // Get or create database
        const database = await DynamicDatabaseManager.getDatabase();
        setDb(database);
        
        // Check if collection exists
        if (!database[collectionName]) {
          throw new Error(`Collection ${collectionName} not found in configs`);
        }
        
        // Subscribe to collection
        subscription = database[collectionName]
          .find()
          .$.subscribe((docs: any[]) => {
            setData(docs);
            setLoading(false);
          });
          
      } catch (err) {
        console.error('Failed to load collection:', err);
        setError(err as Error);
        setLoading(false);
      }
    }
    
    init();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [collectionName]);
  
  // Generate CRUD methods
  const methods = useMemo(() => {
    if (!db || !db[collectionName]) return {};
    
    const collection = db[collectionName];
    
    return {
      async create(doc: any) {
        return await collection.insert({
          ...doc,
          id: doc.id || generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      },
      
      async update(id: string, changes: any) {
        const doc = await collection.findOne(id).exec();
        if (doc) {
          return await doc.patch({
            ...changes,
            updated_at: new Date().toISOString()
          });
        }
      },
      
      async remove(id: string) {
        const doc = await collection.findOne(id).exec();
        if (doc) {
          return await doc.remove();
        }
      },
      
      async search(term: string) {
        const searchFields = config?.ui?.searchFields || ['name'];
        const results = await collection.find({
          selector: {
            $or: searchFields.map(field => ({
              [field]: { $regex: `.*${term}.*`, $options: 'i' }
            }))
          }
        }).exec();
        return results;
      }
    };
  }, [db, collectionName, config]);
  
  return {
    data,
    loading,
    error,
    config,
    ...methods
  };
}

// Helper to generate IDs
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 4. Auto-Generated Collection Hooks

```typescript
// packages/rxdb-store/src/hooks/generated-hooks.ts
import { ConfigLoaderService } from '../services/config-loader';
import { useDynamicCollection } from './useDynamicCollection';

// This can be auto-generated based on configs
export function createCollectionHooks() {
  const configLoader = ConfigLoaderService.getInstance();
  const hooks: Record<string, any> = {};
  
  // Generate a hook for each collection
  configLoader.getAllConfigs().forEach(config => {
    const hookName = `use${config.entity_type.charAt(0).toUpperCase() + config.entity_type.slice(1)}s`;
    
    hooks[hookName] = (filters?: any) => {
      const result = useDynamicCollection(config.collection_name);
      
      // Apply filters if provided
      if (filters && result.data) {
        const filtered = result.data.filter(item => {
          return Object.entries(filters).every(([key, value]) => {
            return item[key] === value;
          });
        });
        return { ...result, data: filtered };
      }
      
      return result;
    };
  });
  
  return hooks;
}

// Usage:
// const hooks = createCollectionHooks();
// export const { useBreeds, usePets, useKennels } = hooks;
```

## 🎨 UI Generation from Config

```typescript
// components/DynamicListView.tsx
import React from 'react';
import { useDynamicCollection } from '@/hooks/useDynamicCollection';

export function DynamicListView({ collectionName }: { collectionName: string }) {
  const { data, loading, config, create, update, remove } = useDynamicCollection(collectionName);
  
  if (loading) return <div>Loading...</div>;
  if (!config) return <div>No config found for {collectionName}</div>;
  
  const columns = config.ui?.listColumns || Object.keys(config.schema.properties);
  
  return (
    <div>
      <h1>
        {config.ui?.icon} {collectionName}
      </h1>
      
      <button onClick={() => create({ name: 'New Item' })}>
        Add {config.entity_type}
      </button>
      
      <table>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col}>{col}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id}>
              {columns.map(col => (
                <td key={col}>
                  {Array.isArray(item[col]) 
                    ? item[col].join(', ')
                    : item[col]
                  }
                </td>
              ))}
              <td>
                <button onClick={() => update(item.id, { name: 'Updated' })}>
                  Edit
                </button>
                <button onClick={() => remove(item.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Usage:
// <DynamicListView collectionName="breeds" />
// <DynamicListView collectionName="pets" />
```

## 🔄 Переваги Config-Driven підходу

### 1. **Динамічність**
- Додавання нових collections без зміни коду
- Зміна схем через Supabase UI
- Real-time оновлення конфігів

### 2. **Консистентність**
- Єдиний source of truth в Supabase
- Автоматична синхронізація схем
- Type safety через RxDB schemas

### 3. **Масштабованість**
- Легко додавати нові entity types
- Переиспользование коду
- Менше boilerplate

### 4. **Offline-First**
- Конфіги кешуються в IndexedDB
- Працює без інтернету
- Автоматична синхронізація при відновленні зв'язку

## 📋 Крок за кроком впровадження

### Phase 1: Setup (2 дні)
1. ✅ Створити ConfigLoaderService
2. ✅ Налаштувати завантаження з app_config
3. 📅 Додати кешування в IndexedDB
4. 📅 Real-time subscription на зміни

### Phase 2: Database (3 дні)
1. 📅 DynamicDatabaseManager
2. 📅 Генерація collections з конфігів
3. 📅 Автоматичний Supabase sync
4. 📅 Testing з різними схемами

### Phase 3: React Integration (3 дні)
1. ✅ useDynamicCollection hook
2. 📅 Auto-generated typed hooks
3. 📅 UI компоненти на основі конфігів
4. 📅 Migration існуючих компонентів

### Phase 4: Advanced (2 дні)
1. 📅 Custom computed fields
2. 📅 Validation rules з конфігів
3. 📅 Permissions з конфігів
4. 📅 UI forms generation

## 🚀 Приклад використання

```typescript
// App.tsx
import { DynamicListView } from '@/components/DynamicListView';
import { useDynamicCollection } from '@/hooks/useDynamicCollection';

function App() {
  // Автоматично завантажує конфіг та створює collection
  const { data: breeds, loading } = useDynamicCollection('breeds');
  
  if (loading) return <div>Initializing database...</div>;
  
  return (
    <div>
      {/* Динамічно генерований UI */}
      <DynamicListView collectionName="breeds" />
      <DynamicListView collectionName="pets" />
      <DynamicListView collectionName="kennels" />
      
      {/* Або custom UI з dynamic data */}
      <div>
        Total breeds: {breeds.length}
      </div>
    </div>
  );
}
```

## ⚠️ Важливі моменти

1. **Перший запуск** - завантаження конфігів може зайняти час
2. **Кешування** - обов'язково для offline роботи
3. **Версіонування схем** - RxDB вимагає migration strategies
4. **Type Safety** - використовуйте TypeScript generics
5. **Performance** - lazy loading для великих collections

## 📚 Додаткові ресурси

- [CONFIG_ARCHITECTURE.md](./CONFIG_ARCHITECTURE.md) - детальна архітектура
- [CONFIG_SETUP.md](./CONFIG_SETUP.md) - налаштування Windmill інтеграції
- [RXDB_IMPLEMENTATION_GUIDE.md](./RXDB_IMPLEMENTATION_GUIDE.md) - RxDB best practices

Цей підхід дозволяє створювати повністю динамічні додатки, де структура даних та UI визначається конфігураціями з бази даних!