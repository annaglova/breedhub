# React SignalStore - Fractal State Management

> 📌 **Актуальна архітектура**: [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) - Local-First PWA з CRDT та AI

React адаптація NgRx SignalStore з самоподібними (fractal) структурами та підтримкою IndexedDB для offline-first додатків.

> **Local-First оновлення**: SignalStore буде інтегрований з Yjs CRDT для автоматичної синхронізації конфліктів в офлайн режимі.

## 🎯 Основні можливості

- **Fractal Architecture** - Самоподібні структури для композиції станів
- **Feature Composition** - Модульні features які можна комбінувати
- **Super Store Hierarchy** - Ієрархічні store з наслідуванням станів
- **IndexedDB Sync** - Автоматична синхронізація з локальною БД
- **Optimistic Updates** - Оптимістичні оновлення з rollback
- **Request Status Management** - Управління статусами запитів
- **Advanced Filtering** - Потужна система фільтрації та пошуку

## 📦 Структура

```
signal-store/
├── core/
│   ├── create-store-feature.ts    # Композиція features
│   └── super-store.ts             # Ієрархічні stores
├── features/
│   ├── with-entities.ts          # CRUD операції
│   ├── with-filtering.ts         # Фільтрація та сортування
│   └── with-request-status.ts    # Управління запитами
├── sync/
│   └── indexed-db-sync.ts        # IndexedDB синхронізація
├── examples/
│   ├── breed-store.ts            # Приклад store
│   └── BreedStoreExample.tsx     # Приклад компонента
├── types.ts                      # TypeScript типи
├── create-signal-store.ts        # Фабрика stores
└── index.ts                      # Публічний API
```

## 🚀 Швидкий старт

### 1. Створення Store

```typescript
import { 
  createSignalStore, 
  withEntities, 
  withFiltering, 
  withRequestStatus 
} from '@/store/signal-store';

// Визначаємо тип entity
interface Product extends Entity {
  id: string;
  name: string;
  price: number;
}

// Створюємо store з features
const useProductStore = createSignalStore<Product>('products', [
  withEntities<Product>(),
  withFiltering<Product>(),
  withRequestStatus(),
]);
```

### 2. Використання в компоненті

```typescript
function ProductList() {
  const store = useProductStore();
  const products = store.computed.filteredEntities;
  const isLoading = store.computed.isLoading;
  
  // CRUD операції
  const handleAdd = () => {
    store.addEntity({ id: '1', name: 'Product', price: 100 });
  };
  
  // Фільтрація
  const handleSearch = (query: string) => {
    store.setSearchQuery(query);
  };
  
  return (
    <div>
      {isLoading ? <Spinner /> : <ProductGrid products={products} />}
    </div>
  );
}
```

### 3. Ієрархічні Stores

```typescript
import { superStoreFactory } from '@/store/signal-store';

// Створюємо ієрархію stores
const rootStore = superStoreFactory.createStore({
  id: 'catalog',
  entityName: 'Product',
  children: [
    { id: 'featured', entityName: 'Product' },
    { id: 'discounted', entityName: 'Product' },
  ]
});

// Дочірні stores наслідують фільтри від батьківського
superStoreFactory.updateStore('catalog', (state) => {
  state.filters = [{ field: 'active', operator: 'equals', value: true }];
});
```

### 4. IndexedDB Синхронізація

```typescript
import { useIndexedDBSync } from '@/store/signal-store';

function ProductsWithSync() {
  const products = useProductStore(s => s.computed.allEntities);
  
  const { syncState, syncNow } = useIndexedDBSync(
    {
      dbName: 'MyApp',
      storeName: 'products',
      indexes: [{ name: 'by_price', keyPath: 'price' }]
    },
    products,
    (syncedProducts) => {
      // Оновлюємо store після синхронізації
      store.setAllEntities(syncedProducts);
    }
  );
  
  const handleSync = () => {
    syncNow(
      async () => fetch('/api/products').then(r => r.json()),
      async (changes) => fetch('/api/sync', { 
        method: 'POST', 
        body: JSON.stringify(changes) 
      })
    );
  };
  
  return (
    <button onClick={handleSync}>
      Sync ({syncState.pendingChanges} pending)
    </button>
  );
}
```

## 🔧 Features

### withEntities
Надає CRUD операції для entities:
- `addEntity`, `addEntities`
- `updateEntity`, `updateEntities`
- `removeEntity`, `removeEntities`
- `setAllEntities`, `clearEntities`

### withSelection
Управління вибраними entities:
- `selectEntity`, `selectEntities`
- `toggleEntitySelection`
- `clearSelection`

### withFiltering
Фільтрація та сортування:
- `setFilter`, `removeFilter`, `clearFilters`
- `setSearchQuery`
- `setSortBy`

### withRequestStatus
Управління статусами запитів:
- `setLoading`, `setSuccess`, `setError`
- `resetStatus`
- Computed: `isLoading`, `hasError`, `hasLoaded`

### withOptimisticUpdate
Оптимістичні оновлення:
- `applyOptimistic`
- `commitOptimistic`
- `rollbackOptimistic`

## 🏗 Архітектурні принципи

### Fractal Pattern
Кожен store може містити інші stores, створюючи самоподібну структуру:
```
RootStore
├── CatalogStore
│   ├── FeaturedStore
│   └── DiscountedStore
└── UserStore
    ├── ProfileStore
    └── SettingsStore
```

### Feature Composition
Features можна комбінувати для створення складних stores:
```typescript
const store = createSignalStore('complex', [
  withEntities(),
  withSelection(),
  withFiltering(),
  withDebouncedSearch(300),
  withRequestStatus(),
  withRetry(3, 1000),
  withOptimisticUpdate(),
]);
```

### State Inheritance
Дочірні stores можуть наслідувати частину стану від батьківських:
- Фільтри пропагуються вниз по ієрархії
- Кожен store може перевизначити наслідувані значення
- Зміни в батьківському store автоматично відображаються в дочірніх

## 🔄 Міграція з NgRx SignalStore

| NgRx SignalStore | React SignalStore |
|-----------------|-------------------|
| `signalStore()` | `createSignalStore()` |
| `withEntities()` | `withEntities()` ✅ |
| `withComputed()` | computed в features ✅ |
| `withMethods()` | methods в features ✅ |
| `withHooks()` | hooks в features ✅ |
| `patchState()` | `set()` через Zustand |
| Signals | React hooks |

## 🎯 Майбутні плани

- [ ] WebSocket синхронізація для real-time оновлень
- [ ] Конфлікт resolution strategies
- [ ] Time-travel debugging
- [ ] Persist middleware для localStorage
- [ ] GraphQL інтеграція
- [ ] React Native підтримка

## 📚 Додаткові ресурси

- [NgRx SignalStore Docs](https://ngrx.io/guide/signals)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)