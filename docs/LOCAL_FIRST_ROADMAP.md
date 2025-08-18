# 🚀 Local-First PWA Implementation Roadmap з RxDB

## 📈 Прогрес впровадження

### ✅ Phase 0: RxDB Setup - ЗАВЕРШЕНО (17.08.2024)
- Database layer implemented
- SignalStore integration complete  
- Playground demo working
- All tests passing

### 🚀 Next: Phase 1 - PWA Basic Functionality

---

## 📊 Поточний стан проекту

### ✅ Що вже є:
- **MultiStore/SignalStore** - базова архітектура state management
- **Playground** - середовище для тестування 
- **Supabase + Windmill** - backend інфраструктура на dev.dogarray.com
- **Dynamic configs** - система конфігурацій в БД
- **Landing page** - майже готова (80%)
- **UI components** - базова бібліотека компонентів

### ❌ Що потребує змін:
- **apps/app** - legacy код з Angular, потребує повної переробки
- **Offline support** - немає офлайн функціональності
- **Reactive database** - немає реактивної локальної БД
- **AI integration** - немає Gemma інтеграції
- **PWA features** - немає service workers, install prompts

### 🎯 Чому RxDB:
- **Готова Supabase синхронізація** - економить 2-3 тижні розробки
- **Вбудований conflict resolution** - автоматичне вирішення конфліктів
- **Query engine** - MongoDB-like запити для складної фільтрації
- **Schema validation** - типізовані колекції з валідацією
- **Production-ready** - використовується в багатьох проектах

## 🎯 Стратегія впровадження

### Принципи:
1. **Інкрементальність** - поступові зміни без ламання існуючого
2. **Тестування** - кожен етап перевіряється в playground
3. **Backward compatibility** - зберігаємо сумісність з існуючим кодом
4. **User value first** - спочатку функції для користувачів

## 📅 Фази впровадження

## Фаза 0: RxDB Setup (1 тиждень) ✅ ЗАВЕРШЕНО

### Мета: Інтегрувати RxDB як офлайн-first database

#### 0.1 Аудит та cleanup (1 день) ✅
```bash
# Задачі:
- [x] Видалити непотрібні залежності
- [x] Оновити package.json з RxDB залежностями
- [x] Створити feature flags для поступової міграції
- [x] Налаштувати TypeScript для strict mode
```

#### 0.2 Встановлення RxDB залежностей (1 день) ✅
```bash
# Core RxDB ✅
pnpm add rxdb # v16.17.2 встановлено
pnpm add dexie # встановлено

# RxDB Plugins ✅
# storage-dexie - встановлено через rxdb/plugins/storage-dexie
# dev-mode - встановлено (але відключено через DB9 issues)
# query-builder - встановлено
# cleanup - встановлено

# Validation (attempted both) ✅
pnpm add ajv # встановлено
pnpm add z-schema # встановлено

# Existing dependencies ✅
# @preact/signals-react - вже є
# @supabase/supabase-js - вже є

# PWA (буде в Phase 1)
# pnpm add -D vite-plugin-pwa workbox-window
# pnpm add -D @vite-pwa/assets-generator

# AI (відкладено до Phase 4)
# pnpm add @mediapipe/tasks-genai
```

#### 0.3 Створення RxDB Database (2 дні) ✅
```typescript
// packages/rxdb-store/src/database.ts ✅ СТВОРЕНО
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

export async function createBreedHubDB() {
  const db = await createRxDatabase({
    name: uniqueName, // Використовуємо унікальні імена для уникнення DB9
    storage: getRxStorageDexie(),
    ignoreDuplicate: true,
    multiInstance: false,
    eventReduce: true
  });

  // Add collections ✅
  await db.addCollections({
    breeds: { schema: breedSchema }, // Реалізовано
    // dogs, kennels, litters - будуть додані пізніше
  });

  return db;
}

// Проблеми вирішені:
// ✅ DB9 помилки - використовуємо унікальні session IDs
// ✅ React StrictMode - відключено для уникнення подвійної ініціалізації
// ✅ Cleanup strategy - видаляємо старі бази при старті
```

#### 0.4 Інтеграція RxDB з SignalStore (2 дні) ✅
```typescript
// packages/rxdb-store/src/signal-integration.ts ✅ СТВОРЕНО
export class RxDBSignalStore<T> {
  private collection: RxCollection<T>;
  items = signal<T[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  count = computed(() => this.items.value.length);
  
  constructor(collection: RxCollection<T>) {
    this.collection = collection;
    
    // RxDB → Signals reactivity ✅
    this.collection.find().$.subscribe({
      next: (docs) => {
        this.items.value = docs;
        this.loading.value = false;
      },
      error: (err) => {
        this.error.value = err.message;
        this.loading.value = false;
      }
    });
  }
  
  // CRUD operations ✅
  async create(item: Partial<T>) { /* implemented */ }
  async update(id: string, data: Partial<T>) { /* implemented */ }
  async delete(id: string) { /* implemented */ }
  async query(query: MangoQuery<T>) { /* implemented */ }
}
```

#### 0.5 Proof of Concept (1 день) ✅
```typescript
// apps/signal-store-playground/src/examples/SimpleRxDBTest.tsx ✅ СТВОРЕНО
export function SimpleRxDBTest() {
  const [db, setDb] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  
  // Database creation with unique session ID ✅
  const sessionId = Date.now().toString(36);
  const uniqueName = `rxdb-demo-${sessionId}`;
  
  // CRUD operations ✅
  const addItem = async () => { /* implemented */ }
  const deleteItem = async () => { /* implemented */ }
  
  return (
    <div>
      <h2>🧪 Simple RxDB Test</h2>
      <p>Status: ✅ Database ready!</p>
      {/* Всі CRUD операції працюють */}
    </div>
  );
}
```

### Deliverables: ✅
- ✅ RxDB database setup в packages/rxdb-store
- ✅ RxDBSignalStore клас з повною інтеграцією
- ⏳ Supabase replication config (відкладено до Phase 2)
- ✅ Working proof of concept в playground на /rxdb

### 🧪 Testing Results: ✅
```typescript
// Всі тести пройдені
describe('Phase 0: RxDB Setup', () => {
  test('✅ Database створюється та працює');
  test('✅ CRUD операції успішні');
  test('✅ SignalStore інтеграція реактивна');
  test('✅ Schema validation працює (з workarounds для DB9)');
  test('✅ Playground demo функціонує на http://localhost:5176/rxdb');
});
```

**Performance Results:** 
- Database creation: ~50-100ms ✅
- Query execution: < 10ms ✅
- IndexedDB persistence: Working ✅
**Playground Page:** `/rxdb` ✅ LIVE

---

## Фаза 1: PWA базова функціональність (2 тижні)

### Мета: Зробити додаток installable PWA

#### 1.0 Покращення архітектури (на основі ngx-odm) (2 дні) ✅ ЗАВЕРШЕНО (18.08.2024)

**Реалізовано:**
- ✅ **Collection Service Pattern** - базовий клас з уніфікованим CRUD інтерфейсом
- ✅ **Breed Service** - доменний сервіс з реактивними computed значеннями
- ✅ **Lazy Collection Loading** - завантаження колекцій на вимогу
- ✅ **Configuration Manager** - централізоване управління конфігурацією
- ✅ **Database Structure Visualization** - візуалізація структури БД
- ✅ **Cleanup Utilities** - утиліти для управління IndexedDB базами

**Вирішені проблеми:**
- DXE1 помилки з enum полями в схемах
- CONFLICT помилки при повторному додаванні документів  
- Індекси на опціональних полях
- Управління множинними IndexedDB базами

**Playground:** `/rxdb` → Phase 1.0 Architecture tab ✅

#### 1.1 Service Worker та Manifest (3 дні) ✅ ЗАВЕРШЕНО (18.08.2024)
**Реалізовано:**
- ✅ **VitePWA Plugin** - інтегровано з автоматичним оновленням
- ✅ **Web App Manifest** - налаштовано з іконками та темою
- ✅ **Service Worker** - реєструється та кешує ресурси
- ✅ **PWA Test Page** - сторінка для тестування PWA функцій
- ✅ **PWA Status Component** - відображення статусу SW та мережі
- ✅ **PWA Install Prompt** - компонент для встановлення додатку
- ✅ **Offline Page** - красива офлайн сторінка
- ✅ **Cache Management** - кнопки для управління кешем

**Важливо для тестування:**
1. В Lighthouse потрібно увімкнути категорію "Progressive Web App" в налаштуваннях (⚙️)
2. Service Worker активний на http://localhost:5174/
3. Install prompt з'являється автоматично при виконанні умов PWA

**Playground:** `/pwa` → PWA Testing Page ✅

#### 1.2 Офлайн сторінки та кешування (3 дні)
- Offline fallback page
- Cache стратегії для різних типів контенту
- Background sync для відкладених операцій

#### 1.3 Install prompts та оновлення (2 дні)
```typescript
// components/InstallPrompt.tsx
export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  // Install logic
};
```

#### 1.4 Push notifications підготовка (2 дні)
- Service worker registration
- Permission requests
- Notification handlers

### Deliverables:
- PWA manifest
- Service Worker з офлайн підтримкою
- Install промпт компонент
- Базове кешування

### 🧪 Testing Requirements:
```typescript
describe('Phase 1: PWA Features', () => {
  test('✅ Lighthouse PWA score > 90');
  test('✅ App installable на всіх платформах');
  test('✅ Service Worker кешує static files');
  test('✅ Offline mode працює коректно');
  test('✅ Install prompt UX зручний');
});
```

**Browser Testing:** Chrome, Firefox, Safari, Edge
**Device Testing:** Desktop, Mobile (iOS/Android)
**Playground Page:** `/test/pwa`

---

## Фаза 2: RxDB Supabase Replication (2 тижні)

### Мета: Повна офлайн функціональність з автоматичною синхронізацією

#### 2.0 Архітектурні покращення з ngx-odm (2 дні) 🆕
```typescript
// Replication State Factory Pattern
export interface ReplicationConfig {
  collections: string[];
  supabaseUrl: string;
  supabaseKey: string;
  batchSize?: number;
  retryStrategy?: RetryConfig;
}

// Centralized Sync Manager
export class SyncManager {
  private replicators = new Map<string, SupabaseReplicator>();
  
  async startSync(config: ReplicationConfig) {
    for (const collectionName of config.collections) {
      const replicator = new SupabaseReplicator(config);
      await replicator.setupReplication(collectionName);
      this.replicators.set(collectionName, replicator);
    }
  }
  
  pauseAll() { /* ... */ }
  resumeAll() { /* ... */ }
  getStatus(): SyncStatus { /* ... */ }
}
```

#### 2.1 RxDB Schemas Definition (2 дні)
```typescript
// packages/rxdb-store/src/schemas/index.ts
export const breedSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    description: { type: 'string' },
    traits: { type: 'array', items: { type: 'string' } },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean' } // для soft delete
  },
  required: ['id', 'name'],
  indexes: ['name', 'updatedAt']
};
```

#### 2.2 Supabase Replication Setup (3 дні)
```typescript
// packages/rxdb-store/src/replication.ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

export async function setupSupabaseReplication(
  collection: RxCollection,
  tableName: string
) {
  return replicateRxCollection({
    collection,
    replicationIdentifier: `${tableName}-supabase`,
    pull: {
      async handler(checkpoint) {
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .gt('updatedAt', checkpoint?.updatedAt || '1970-01-01')
          .order('updatedAt')
          .limit(100);
        
        return {
          documents: data,
          checkpoint: data?.length ? 
            { updatedAt: data[data.length - 1].updatedAt } : 
            checkpoint
        };
      }
    },
    push: {
      async handler(docs) {
        const { error } = await supabase
          .from(tableName)
          .upsert(docs);
        return error ? [] : docs;
      }
    }
  });
}
```

#### 2.3 Conflict Resolution (3 дні)
```typescript
// packages/rxdb-store/src/conflicts.ts
export const conflictHandler = {
  // Last-write-wins strategy
  onConflict(local, remote) {
    if (local.updatedAt > remote.updatedAt) {
      return local;
    }
    return remote;
  },
  
  // Custom merge for specific fields
  mergeFields: {
    tags: (local, remote) => [...new Set([...local, ...remote])],
    traits: (local, remote) => ({ ...remote, ...local })
  }
};
```

#### 2.4 Migration від MultiStore (2 дні)
```typescript
// packages/signal-store/src/migration.ts
export async function migrateToRxDB() {
  const oldData = multiStore.getAllEntities();
  const db = await createBreedHubDB();
  
  for (const entity of oldData) {
    await db[entity._type + 's'].insert(entity);
  }
  
  // Verify migration
  const count = await db.breeds.count().exec();
  console.log(`Migrated ${count} breeds`);
}
```

### Deliverables:
- RxDB schemas для всіх entities
- Працююча Supabase синхронізація
- Conflict resolution strategies
- Migration script від MultiStore

### 🧪 Testing Requirements:
```typescript
describe('Phase 2: Sync & Replication', () => {
  test('✅ Push/Pull з Supabase працює');
  test('✅ Offline changes синхронізуються');
  test('✅ Conflicts вирішуються автоматично');
  test('✅ Large dataset sync (1000+ docs)');
  test('✅ Network interruption recovery');
  test('✅ No data loss при sync');
});
```

**Performance Targets:**
- Sync 100 docs < 2s
- Sync 1000 docs < 10s
- Conflict resolution < 100ms
**Playground Page:** `/test/sync`

---

## Фаза 3: UI оновлення для Local-First (2 тижні)

### Мета: Адаптувати UI для офлайн роботи

#### 3.0 Advanced Features з ngx-odm (2 дні) 🆕
```typescript
// 1. Query Persistence Plugin (зберігати фільтри в URL)
export class QueryPersistence {
  saveToURL(query: MangoQuery): void {
    const params = new URLSearchParams(window.location.search);
    params.set('query', JSON.stringify(query));
    window.history.replaceState({}, '', `?${params}`);
  }
  
  loadFromURL(): MangoQuery | null {
    const params = new URLSearchParams(window.location.search);
    const queryStr = params.get('query');
    return queryStr ? JSON.parse(queryStr) : null;
  }
}

// 2. Batch Operations Helper
export class BatchOperations {
  async batchInsert<T>(collection: RxCollection<T>, docs: T[], chunkSize = 100) {
    const chunks = chunk(docs, chunkSize);
    for (const chunk of chunks) {
      await collection.bulkInsert(chunk);
      // Progress callback
    }
  }
}

// 3. Local Documents для user settings
export async function saveUserSettings(settings: UserSettings) {
  const localDoc = await db.getLocal('user-settings');
  if (localDoc) {
    await localDoc.update({ $set: settings });
  } else {
    await db.insertLocal('user-settings', settings);
  }
}
```

#### 3.1 Офлайн індикатори (3 дні)
```typescript
// components/OfflineIndicator.tsx
export const OfflineIndicator = () => {
  const isOnline = useOnlineStatus();
  const syncStatus = useSyncStatus();
  // UI logic
};
```

#### 3.2 Optimistic UI updates (4 дні)
- Миттєві локальні оновлення
- Rollback при помилках синхронізації
- Conflict resolution UI

#### 3.3 Адаптація форм для офлайн (3 дні)
- Local validation
- Queue для відкладеного збереження
- Retry механізми

#### 3.4 Performance оптимізація (2 дні)
- Virtual scrolling для великих списків
- Lazy loading компонентів
- Memory management

### Deliverables:
- Офлайн-aware UI компоненти
- Optimistic updates
- Performance покращення

### 🧪 Testing Requirements:
```typescript
describe('Phase 3: UI/UX', () => {
  test('✅ Offline indicator accurate');
  test('✅ Optimistic updates < 10ms');
  test('✅ Rollback працює при errors');
  test('✅ No UI flickering');
  test('✅ Virtual scrolling smooth');
  test('✅ Memory usage stable');
});
```

**UX Testing:**
- User testing sessions
- A/B testing for critical flows
- Accessibility audit (WCAG 2.1)
**Playground Page:** `/test/ui`

---

## Фаза 4: Gemma AI інтеграція (3 тижні) - ОПЦІЙНО

### Мета: On-device AI функції

#### 4.1 WebGPU перевірка та fallback (2 дні)
```typescript
// ai/gemma-setup.ts
export const initGemma = async () => {
  const hasWebGPU = 'gpu' in navigator;
  // Setup logic
};
```

#### 4.2 Model loading та кешування (3 дні)
- Progressive download
- IndexedDB кешування моделі
- Loading UI

#### 4.3 AI функції (1.5 тижні)
- Natural language commands
- Breeding recommendations
- Pedigree analysis

#### 4.4 Premium features gate (2 дні)
- Subscription перевірка
- Feature flags для AI

### Deliverables:
- Gemma 270M інтеграція
- AI команди interface
- Premium subscription gate

### 🧪 Testing Requirements:
```typescript
describe('Phase 4: AI Features', () => {
  test('✅ Model loads < 30s');
  test('✅ WebGPU performance > 10 tokens/s');
  test('✅ Natural language parsing accurate');
  test('✅ Fallback to CPU works');
  test('✅ Memory < 1GB with model');
});
```

**AI Testing:**
- Accuracy metrics for commands
- Performance on different devices
- Edge case handling
**Playground Page:** `/test/ai`

---

## Фаза 5: Міграція apps/app (4 тижні)

### Мета: Переписати legacy app на Local-First

#### 5.1 Аналіз існуючого коду (3 дні)
- Mapping Angular → React компонентів
- Визначення пріоритетних features
- План міграції

#### 5.2 Базові сторінки (1 тиждень)
- Dashboard
- Breeds list/detail
- Dogs list/detail

#### 5.3 Складні features (1.5 тижні)
- Pedigree builder
- Health tracking
- Show management

#### 5.4 Testing та bugfixing (3 дні)
- E2E тести
- Performance testing
- Bug fixes

### Deliverables:
- Повністю мігрований app
- E2E test coverage
- Performance benchmarks

### 🧪 Testing Requirements:
```typescript
describe('Phase 5: Full Migration', () => {
  test('✅ All features работают');
  test('✅ Data integrity 100%');
  test('✅ Performance не деградував');
  test('✅ E2E tests pass');
  test('✅ Rollback працює');
  test('✅ User acceptance testing passed');
});
```

**Final Testing:**
- Full regression testing
- Load testing (1000+ concurrent users)
- Security audit
- Production smoke tests
**Test Report:** `/docs/migration-test-report.md`

---

## 🚦 Quick Wins (можна робити паралельно)

### Тиждень 1-2:
1. **RxDB Proof of Concept** - базова інтеграція в playground (2 дні)
2. **PWA Install** - зробити app installable (2 дні)
3. **Базовий офлайн** - RxDB автоматично кешує дані (1 день)
4. **Loading states** - покращити UX при завантаженні (1 день)

### Тиждень 3-4:
1. **RxDB для breeds** - мігрувати тільки breeds спочатку (3 дні)
2. **Sync індикатор** - показувати RxDB replication status (2 дні)
3. **Query builder UI** - інтерфейс для складних запитів (3 дні)
4. **Conflict resolution UI** - показувати та вирішувати конфлікти (2 дні)

---

## 📊 Метрики успіху

### Performance:
- [ ] Time to Interactive < 3s
- [ ] Offline response time < 10ms
- [ ] Sync latency < 1s при online

### Reliability:
- [ ] 100% offline functionality
- [ ] Zero data loss
- [ ] Automatic conflict resolution 95%+

### User Experience:
- [ ] PWA Lighthouse score > 95
- [ ] Install rate > 30%
- [ ] Offline usage > 50%

---

## 🛠 Інструменти та ресурси

### Development:
- Chrome DevTools → Application tab для PWA
- Redux DevTools для signals debugging
- Yjs DevTools для CRDT monitoring

### Testing:
- Playwright для E2E
- Vitest для unit tests
- Lighthouse для PWA audit

### Monitoring:
- Sentry для error tracking
- Analytics для usage patterns
- Performance monitoring

---

## ⚠️ Ризики та мітигація

### Технічні ризики:
1. **CRDT complexity** → Почати з простих типів
2. **IndexedDB limits** → Pagination та cleanup
3. **WebGPU support** → WASM fallback

### Бізнес ризики:
1. **User adoption** → Поступова міграція
2. **Data migration** → Backup та rollback план
3. **Performance** → Incremental loading

---

## 🎯 Наступні кроки з RxDB

### Негайно (цей тиждень):
1. ✅ Створити feature branch `feature/rxdb-local-first`
2. ✅ Встановити RxDB залежності:
   ```bash
   pnpm add rxdb rxdb/plugins/storage-dexie dexie
   ```
3. ✅ Створити RxDB database прототип
4. ✅ Протестувати базові операції в playground

### Наступний тиждень:
1. ⏳ Налаштувати Supabase replication
2. ⏳ Додати PWA manifest та service worker
3. ⏳ Мігрувати breeds на RxDB
4. ⏳ Створити sync status UI

### Через 2 тижні:
1. ⏳ Мігрувати всі entities на RxDB
2. ⏳ Реалізувати складні queries
3. ⏳ Optimistic UI updates через RxJS
4. ⏳ Production-ready conflict resolution

---

## 🧪 Testing Infrastructure

### Testing Stack:
- **Unit/Integration:** Vitest + React Testing Library
- **E2E:** Playwright
- **Performance:** Lighthouse + Chrome DevTools
- **Manual:** Playground (`/apps/signal-store-playground`)

### Test Documentation:
- **Strategy:** `/docs/TESTING_STRATEGY.md` - детальний план тестування
- **Tracker:** `/apps/signal-store-playground/TEST_TRACKER.md` - відстеження пройдених тестів
- **Reports:** `/test-reports/` - результати тестування

### Testing Workflow:
```bash
# Run tests locally
pnpm test:unit         # Unit tests
pnpm test:integration  # Integration tests
pnpm test:e2e         # E2E tests

# Playground testing
pnpm dev:playground
# Navigate to http://localhost:5174/test

# Specific test pages
/test/rxdb    # RxDB tests
/test/pwa     # PWA tests  
/test/sync    # Sync tests
/test/ui      # UI tests
/test/perf    # Performance tests
```

### Critical Test Gates:
Кожна фаза має пройти ці тести перед release:
1. ✅ Unit test coverage > 80%
2. ✅ Zero critical bugs
3. ✅ Performance metrics в межах targets
4. ✅ Manual testing in playground passed
5. ✅ Cross-browser testing passed
6. ✅ Sign-off від tech lead

## 💡 Поради для розробки

1. **Start small** - Почніть з однієї entity (breeds)
2. **Test offline** - Використовуйте Chrome DevTools Network → Offline
3. **Monitor performance** - Performance tab для профілювання
4. **User feedback** - Збирайте feedback на кожному етапі
5. **Incremental migration** - Не намагайтесь мігрувати все одразу
6. **Test early and often** - Тестуйте кожну зміну в playground

---

**Готові почати?** Почніть з Фази 0 - RxDB setup з обов'язковим тестуванням! 🚀