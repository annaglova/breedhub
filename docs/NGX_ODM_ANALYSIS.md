# 📚 ngx-odm Analysis & Adaptation for BreedHub

## 🔍 Overview
[ngx-odm](https://github.com/voznik/ngx-odm) - це Angular wrapper для RxDB з цікавими патернами, які можна адаптувати для React/Signals.

## 🎯 Ключові концепції для запозичення

### 1. Collection Service Pattern
**ngx-odm підхід:**
```typescript
export class RxDBCollectionService<T> {
  // Unified CRUD interface
  insert(docs: T[]): Promise<any>
  update(id: string, doc: Partial<T>): Promise<any>
  remove(id: string): Promise<any>
  
  // Reactive queries
  find(query?: MangoQuery): Observable<T[]>
  findOne(id: string): Observable<T>
  count(): Observable<number>
}
```

**Наша адаптація для React/Signals:**
```typescript
export class CollectionService<T> {
  // Signals-based state
  items = signal<T[]>([]);
  loading = signal(false);
  error = signal<Error | null>(null);
  
  // Unified CRUD з Promises
  async insert(docs: T[]): Promise<void>
  async update(id: string, doc: Partial<T>): Promise<void>
  async remove(id: string): Promise<void>
  
  // Reactive queries з Signals
  find(query?: MangoQuery): ReadonlySignal<T[]>
  findOne(id: string): ReadonlySignal<T | null>
  count(): ReadonlySignal<number>
}
```

### 2. Lazy Collection Loading
**ngx-odm підхід:**
- Collections завантажуються тільки при першому використанні
- Schemas можуть завантажуватися з remote URLs

**Наша адаптація:**
```typescript
export class LazyCollectionLoader {
  private loadedCollections = new Map<string, RxCollection>();
  
  async getCollection<T>(name: string): Promise<RxCollection<T>> {
    if (!this.loadedCollections.has(name)) {
      const schema = await this.loadSchema(name);
      const collection = await this.createCollection(name, schema);
      this.loadedCollections.set(name, collection);
    }
    return this.loadedCollections.get(name);
  }
  
  private async loadSchema(name: string): Promise<RxJsonSchema> {
    // Можемо завантажувати з URL або локального файлу
    const response = await fetch(`/schemas/${name}.schema.json`);
    return response.json();
  }
}
```

### 3. Configuration Pattern
**ngx-odm підхід:**
```typescript
const rxdbConfig = {
  name: 'mydb',
  storage: getRxStorageDexie(),
  multiInstance: true,
  ignoreDuplicate: true
};
```

**Наша адаптація (вже частково реалізовано):**
```typescript
export interface RxDBConfig {
  name: string;
  storage: RxStorage;
  collections: CollectionConfig[];
  plugins?: RxPlugin[];
  sync?: SyncConfig;
}

export class RxDBManager {
  private static instance: RxDatabase;
  
  static async initialize(config: RxDBConfig): Promise<RxDatabase> {
    if (this.instance) return this.instance;
    
    // Add plugins
    config.plugins?.forEach(plugin => addRxPlugin(plugin));
    
    // Create database
    this.instance = await createRxDatabase({
      name: config.name,
      storage: config.storage,
      multiInstance: false,
      eventReduce: true
    });
    
    // Add collections
    for (const col of config.collections) {
      await this.addCollection(col);
    }
    
    return this.instance;
  }
}
```

### 4. Signal Store Integration
**ngx-odm з @ngrx/signals:**
```typescript
export const TodoStore = signalStore(
  withEntities<Todo>(),
  withCollectionService<Todo>({
    collectionConfig: todoCollectionConfig
  })
);
```

**Наша адаптація з Preact Signals:**
```typescript
export class SignalStore<T> {
  // Entity state
  private entities = signal<Map<string, T>>(new Map());
  private ids = signal<string[]>([]);
  
  // Computed values
  items = computed(() => 
    this.ids.value.map(id => this.entities.value.get(id)!)
  );
  
  count = computed(() => this.ids.value.length);
  
  // Collection integration
  constructor(private collection: RxCollection<T>) {
    // Auto-sync with RxDB
    this.collection.$.subscribe(docs => {
      const map = new Map(docs.map(d => [d.id, d]));
      this.entities.value = map;
      this.ids.value = Array.from(map.keys());
    });
  }
  
  // Entity methods
  addOne(entity: T): void { /* ... */ }
  updateOne(id: string, changes: Partial<T>): void { /* ... */ }
  removeOne(id: string): void { /* ... */ }
  setAll(entities: T[]): void { /* ... */ }
}
```

### 5. Replication State Management
**ngx-odm підхід:**
```typescript
replicationStateFactory: (collection) => {
  return replicateCouchDB({
    collection,
    url: 'http://localhost:5984/mydb',
    live: true,
    retry: true
  });
}
```

**Наша адаптація для Supabase (Phase 2):**
```typescript
export class SupabaseReplicator {
  private replicationStates = new Map<string, RxReplicationState>();
  
  async setupReplication(collection: RxCollection): Promise<void> {
    const state = await replicateSupabase({
      collection,
      supabaseClient: this.supabase,
      tableName: collection.name,
      pull: {
        batchSize: 100,
        modifier: (doc) => ({ ...doc, _deleted: false })
      },
      push: {
        batchSize: 50,
        modifier: (doc) => omit(doc, ['_rev', '_attachments'])
      },
      live: true,
      retry: true
    });
    
    this.replicationStates.set(collection.name, state);
    
    // Monitor sync status
    state.error$.subscribe(err => {
      console.error(`Sync error for ${collection.name}:`, err);
    });
  }
}
```

## 🚀 Рекомендації для впровадження

### Phase 1 (PWA) - можна запозичити:
1. **Lazy loading pattern** для collections - завантажувати тільки потрібні
2. **Configuration pattern** - централізоване налаштування бази

### Phase 2 (Supabase Sync) - корисні патерни:
1. **Replication state factory** - гнучке налаштування синхронізації
2. **Error handling** - централізована обробка помилок синхронізації
3. **Retry strategies** - автоматичні повтори при розриві з'єднання

### Phase 3 (Advanced Features) - додаткові ідеї:
1. **Query persistence plugin** - зберігати фільтри в URL
2. **Batch operations** - масові операції над документами
3. **Local documents** - для налаштувань користувача

## 📋 Action Items

### Immediate (для поточної архітектури):
- [ ] Додати lazy loading для collections
- [ ] Створити єдиний CollectionService базовий клас
- [ ] Покращити error handling в RxDBSignalStore

### Phase 1 Preparation:
- [ ] Імплементувати configuration manager
- [ ] Додати schema validation utilities
- [ ] Створити migration system для schemas

### Phase 2 Preparation:
- [ ] Дизайн replication state management
- [ ] Підготувати Supabase adapter
- [ ] Створити conflict resolution strategies

## 💡 Висновки

ngx-odm демонструє mature patterns для RxDB інтеграції:
1. **Абстракція складності** - прості API для складних операцій
2. **Реактивність** - все reactive by default
3. **Type safety** - повна типізація з TypeScript
4. **Модульність** - легко розширювати функціональність

Ці патерни можна успішно адаптувати для React/Signals архітектури, що дасть нам:
- Чистіший код
- Кращу maintainability
- Простішу інтеграцію нових features
- Консистентний API across collections

## 🔗 Корисні посилання
- [ngx-odm GitHub](https://github.com/voznik/ngx-odm)
- [RxDB Documentation](https://rxdb.info/)
- [@ngrx/signals](https://ngrx.io/guide/signals)
- [Preact Signals](https://preactjs.com/guide/v10/signals/)