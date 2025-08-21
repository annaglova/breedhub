# 🚀 React Signal Store Migration Plan

> Комплексний план міграції з MultiStore на Signal-based архітектуру для **React** проекту

## ⚠️ ВАЖЛИВО: NgRx НЕ для React!

**NgRx Signal Store** - це Angular-only бібліотека. Для React використовуємо:
- **@preact/signals-react** - сигнали в React (вже використовується)
- **Valtio** або **Zustand** - альтернативи для state management
- **RxDB** - для offline-first (вже використовується)
- **Custom Signal Store patterns** - власна імплементація

## 📊 Правильна архітектура для React

### Поточний стек (правильний):
```
React + @preact/signals-react + RxDB + Supabase
```

### Рекомендована архітектура:
```typescript
// packages/signal-store/src/stores/universal-store.ts
import { signal, computed, effect, batch } from '@preact/signals-react';
import { createRxDatabase } from 'rxdb';

// Signal-based store для React
export class SignalStore<T> {
  // Signals для стану
  private _entities = signal<Map<string, T>>(new Map());
  private _loading = signal(false);
  private _error = signal<Error | null>(null);
  
  // Computed values
  entities = computed(() => Array.from(this._entities.value.values()));
  count = computed(() => this._entities.value.size);
  
  // RxDB integration
  constructor(private collection: RxCollection<T>) {
    // Sync RxDB → Signals
    this.collection.$.subscribe(docs => {
      batch(() => {
        const map = new Map(docs.map(d => [d.id, d]));
        this._entities.value = map;
      });
    });
  }
  
  // CRUD методи
  async add(entity: T) {
    this._loading.value = true;
    try {
      await this.collection.insert(entity);
    } catch (err) {
      this._error.value = err;
    } finally {
      this._loading.value = false;
    }
  }
}
```

## 🔄 Альтернативи для React

### 1. **Valtio** (проксі-based reactive state)
```typescript
import { proxy, useSnapshot } from 'valtio';
import { subscribeKey } from 'valtio/utils';

const store = proxy({
  breeds: [],
  pets: [],
  loading: false
});

// React component
function BreedsComponent() {
  const snap = useSnapshot(store);
  return <div>{snap.breeds.map(...)}</div>;
}

// Mutations
store.breeds.push(newBreed); // Автоматичний ререндер!
```

### 2. **Zustand** (популярний в React спільноті)
```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface StoreState {
  breeds: Breed[];
  addBreed: (breed: Breed) => void;
  syncWithSupabase: () => Promise<void>;
}

const useStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    breeds: [],
    
    addBreed: (breed) => set(state => ({
      breeds: [...state.breeds, breed]
    })),
    
    syncWithSupabase: async () => {
      const data = await supabase.from('breeds').select();
      set({ breeds: data });
    }
  }))
);
```

### 3. **Jotai** (atomic state management)
```typescript
import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Atoms
const breedsAtom = atomWithStorage('breeds', []);
const petsAtom = atom([]);

// Derived atoms (як computed в signals)
const totalCountAtom = atom(
  get => get(breedsAtom).length + get(petsAtom).length
);

// React component
function App() {
  const [breeds, setBreeds] = useAtom(breedsAtom);
  const totalCount = useAtomValue(totalCountAtom);
}
```

## 🎯 Рекомендована стратегія для BreedHub

### Залишити поточний стек! ✅

Ваш поточний стек **вже оптимальний** для React:

```typescript
// packages/signal-store - вже правильно!
import { signal, computed, effect } from '@preact/signals-react';

export class ReactSignalStore {
  // Це вже правильна імплементація для React!
  items = signal<Item[]>([]);
  
  // Computed values працюють в React
  sorted = computed(() => 
    this.items.value.sort((a, b) => a.name.localeCompare(b.name))
  );
  
  // Effects для side-effects
  constructor() {
    effect(() => {
      console.log('Items changed:', this.items.value);
      this.syncToIndexedDB();
    });
  }
}
```

### Config-driven підхід (адаптований для React):

```typescript
// packages/signal-store/src/config-driven-store.ts
import { signal, computed } from '@preact/signals-react';
import { createRxDatabase } from 'rxdb';

export class ConfigDrivenStore {
  private stores = new Map();
  
  async initialize() {
    // Завантаження конфігів з Supabase
    const configs = await this.loadConfigs();
    
    // Створення RxDB collections
    const db = await createRxDatabase({
      name: 'breedhub',
      storage: getRxStorageDexie()
    });
    
    // Генерація stores для кожної колекції
    for (const config of configs) {
      const collection = await db.addCollections({
        [config.collection_name]: {
          schema: this.generateSchema(config)
        }
      });
      
      // Створюємо signal-based store
      const store = this.createSignalStore(collection[config.collection_name]);
      this.stores.set(config.collection_name, store);
    }
  }
  
  private createSignalStore(collection: RxCollection) {
    const entities = signal([]);
    const loading = signal(false);
    
    // Sync RxDB → Signals
    collection.$.subscribe(docs => {
      entities.value = docs;
    });
    
    return {
      entities,
      loading,
      // CRUD methods
      add: (item) => collection.insert(item),
      update: (id, changes) => collection.upsert({ id, ...changes }),
      remove: (id) => collection.findOne(id).remove()
    };
  }
}
```

## 📦 React Hooks для Signal Store

```typescript
// packages/signal-store/src/hooks/useSignalStore.ts
import { useSignal, useComputed, useSignalEffect } from '@preact/signals-react/runtime';

export function useSignalStore(collectionName: string) {
  const store = useContext(StoreContext);
  const collection = store.getCollection(collectionName);
  
  // Signals в React компонентах
  const items = useSignal(collection.entities);
  const loading = useSignal(collection.loading);
  
  // Computed в React
  const sortedItems = useComputed(() => 
    items.value.sort((a, b) => a.name.localeCompare(b.name))
  );
  
  // Effects в React
  useSignalEffect(() => {
    if (items.value.length > 0) {
      console.log('Items loaded:', items.value);
    }
  });
  
  return {
    items: items.value,
    loading: loading.value,
    sortedItems: sortedItems.value,
    add: collection.add,
    update: collection.update,
    remove: collection.remove
  };
}

// Використання в компоненті
function BreedsComponent() {
  const { items, loading, add } = useSignalStore('breeds');
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      {items.map(breed => (
        <BreedCard key={breed.id} breed={breed} />
      ))}
      <button onClick={() => add({ name: 'New Breed' })}>
        Add Breed
      </button>
    </div>
  );
}
```

## 🚫 Чому НЕ NgRx в React

| NgRx Feature | React Alternative |
|--------------|------------------|
| `@Injectable` | Context API або просто імпорти |
| `signalStore()` | Custom class або Zustand/Valtio |
| `withEntities()` | Map/Set в signals |
| `withComputed()` | `computed()` from @preact/signals |
| `withMethods()` | Звичайні методи класу |
| `withHooks()` | useEffect або signal effects |
| `patchState()` | `signal.value = newValue` |

## ✅ Правильний план міграції для React

### Week 1: Оптимізація поточного SignalStore
- [x] Використовувати @preact/signals-react (вже є!)
- [ ] Додати config loader для Supabase
- [ ] Створити factory для dynamic stores

### Week 2: RxDB Integration
- [x] RxDB setup (вже є!)
- [ ] Автоматична генерація schemas з конфігів
- [ ] Two-way sync RxDB ↔ Signals

### Week 3: React-specific Features
- [ ] Custom hooks для stores
- [ ] React DevTools integration
- [ ] Optimistic updates
- [ ] Error boundaries

### Week 4: Testing & Migration
- [ ] Unit tests для signal stores
- [ ] Integration tests з RxDB
- [ ] Міграція компонентів
- [ ] Performance testing

## 🎯 Висновок

**НЕ використовуйте NgRx в React!** Ваш поточний стек з @preact/signals-react + RxDB вже оптимальний.

Замість NgRx Signal Store використовуйте:
1. **@preact/signals-react** - вже маєте ✅
2. **RxDB** - вже маєте ✅
3. **Custom Signal Store patterns** - створіть власні
4. **Або Zustand/Valtio** - якщо хочете готове рішення

**Головне:** Config-driven підхід працюватиме однаково добре з будь-яким state management!