# 🧪 Testing Strategy для Local-First PWA Implementation

## 📊 Поточний стан тестування (оновлено: грудень 2024)

### ✅ Реалізовано: 110 unit тестів

| Модуль | Файл тестів | К-сть тестів | Статус |
|--------|-------------|--------------|--------|
| EntityStore | `stores/base/__tests__/entity-store.test.ts` | 52 | ✅ Готово |
| SpaceStore helpers | `stores/__tests__/space-store.test.ts` | 44 | ✅ Готово |
| TabDataService | `services/__tests__/tab-data.service.test.ts` | 14 | ✅ Готово |

**Запуск тестів:**
```bash
cd packages/rxdb-store
pnpm test           # watch mode
pnpm test -- --run  # single run
npx vitest run      # альтернатива
```

### Покриття по модулях:

**EntityStore (52 тести)** - база для всіх сторів:
- Ініціалізація та початковий стан
- CRUD: setAll, addOne/Many, updateOne/Many, upsertOne/Many, removeOne/Many/All
- Selection: selectEntity, selectFirst, selectLast, clearSelection
- Selectors: selectById, selectByIds, selectWhere, hasEntity
- State management: loading, error, totalFromServer, reset

**SpaceStore helpers (44 тести)** - чисті функції парсингу:
- `removeFieldPrefix()` - видалення префіксу entity з полів
- `detectOperator()` - автодетект оператора фільтра по типу поля
- `getEntityTypeFromTableType()` - визначення типу entity з таблиці
- `parseSortOptions()` - парсинг sort_fields з конфігу
- `parseFilterFields()` - парсинг filter_fields з конфігу
- `findMainFilterField()` - пошук головного поля фільтра для search

**TabDataService (14 тестів)** - оркестрація завантаження даних:
- Роутинг по типах dataSource (child, child_view, child_with_dictionary, main_filtered)
- loadChild - передача limit/orderBy
- loadChildWithDictionary - merge dictionary з children, showAll/filter/orderBy
- loadMainFiltered - applyFilters з правильними параметрами

### ❌ Не покрито (потребує інтеграційних тестів):

| Модуль | Складність | Пріоритет | Примітка |
|--------|------------|-----------|----------|
| `network-helpers.ts` | Легко | Низький | 3 прості функції (isOnline, isOffline, isNetworkError) |
| `ttl-cleanup.helper.ts` | Середня | Середній | Потребує RxDB mock |
| `DictionaryStore` | Середня | Середній | Кешування словників |
| SpaceStore інтеграція | Складно | Високий | RxDB + Supabase |
| Collection creation | Складно | Середній | Динамічне створення схем |

### 🎯 Рекомендації для подальшого тестування:

1. **Інтеграційні тести** - додавати при знаходженні багів або рефакторингу
2. **E2E тести (Playwright)** - для критичних user flows
3. **network-helpers.ts** - швидко додати (~10 тестів) якщо потрібно

---

## 📋 Загальні принципи тестування

### Типи тестів:
1. **Unit Tests** - окремі функції та компоненти ✅ РЕАЛІЗОВАНО
2. **Integration Tests** - взаємодія між модулями (частково)
3. **E2E Tests** - повні user flows (TODO)
4. **Performance Tests** - швидкість та memory usage
5. **Offline Tests** - робота без інтернету
6. **Sync Tests** - синхронізація даних

### Інструменти:
- **Vitest** - unit та integration тести ✅ Налаштовано
- **Playwright** - E2E тестування (TODO)
- **Chrome DevTools** - performance та network testing
- **Playground** - ручне тестування та демо

## 🎯 Testing Checklist для кожної фази

## Фаза 0: RxDB Setup Testing

### 0.1 Database Creation Tests
```typescript
// tests/rxdb/database.test.ts
describe('RxDB Database', () => {
  test('створення бази даних', async () => {
    const db = await createBreedHubDB();
    expect(db).toBeDefined();
    expect(db.name).toBe('breedhub');
  });

  test('додавання колекцій', async () => {
    const db = await createBreedHubDB();
    expect(db.breeds).toBeDefined();
    expect(db.dogs).toBeDefined();
    expect(db.kennels).toBeDefined();
  });

  test('schema validation', async () => {
    const db = await createBreedHubDB();
    const invalidBreed = { name: 123 }; // має бути string
    await expect(db.breeds.insert(invalidBreed)).rejects.toThrow();
  });
});
```

### 0.2 CRUD Operations Tests
```typescript
describe('CRUD Operations', () => {
  test('CREATE - додавання документа', async () => {
    const breed = { id: '1', name: 'Labrador' };
    const doc = await db.breeds.insert(breed);
    expect(doc.name).toBe('Labrador');
  });

  test('READ - пошук документів', async () => {
    const breeds = await db.breeds.find().exec();
    expect(breeds.length).toBeGreaterThan(0);
  });

  test('UPDATE - оновлення документа', async () => {
    const doc = await db.breeds.findOne('1').exec();
    await doc.patch({ name: 'Golden Retriever' });
    expect(doc.name).toBe('Golden Retriever');
  });

  test('DELETE - видалення документа', async () => {
    const doc = await db.breeds.findOne('1').exec();
    await doc.remove();
    const deleted = await db.breeds.findOne('1').exec();
    expect(deleted).toBeNull();
  });
});
```

### 0.3 SignalStore Integration Tests
```typescript
describe('RxDB + Signals Integration', () => {
  test('зміни в RxDB оновлюють signals', async () => {
    const store = new RxDBSignalStore(db.breeds);
    const breed = { id: '2', name: 'Poodle' };
    
    await store.create(breed);
    expect(store.items.value).toContainEqual(breed);
  });

  test('reactive queries', async () => {
    const store = new RxDBSignalStore(db.breeds);
    const query$ = store.find({ selector: { name: 'Poodle' } });
    
    let results = [];
    query$.subscribe(docs => results = docs);
    
    await store.create({ id: '3', name: 'Poodle' });
    expect(results).toHaveLength(2);
  });
});
```

### Playground Tests для Фази 0:
- [ ] Database створюється без помилок
- [ ] Всі 4 колекції доступні
- [ ] CRUD операції працюють
- [ ] Signals оновлюються автоматично
- [ ] DevTools показують RxDB операції

---

## Фаза 1: PWA Testing

### 1.1 Service Worker Tests
```typescript
describe('Service Worker', () => {
  test('реєстрація service worker', async () => {
    const registration = await navigator.serviceWorker.ready;
    expect(registration.active).toBeDefined();
  });

  test('кешування статичних файлів', async () => {
    const cache = await caches.open('static-v1');
    const response = await cache.match('/index.html');
    expect(response).toBeDefined();
  });
});
```

### 1.2 PWA Manifest Tests
```typescript
describe('PWA Manifest', () => {
  test('manifest присутній', () => {
    const link = document.querySelector('link[rel="manifest"]');
    expect(link).toBeDefined();
  });

  test('install prompt працює', async () => {
    const { userChoice } = await deferredPrompt;
    expect(['accepted', 'dismissed']).toContain(userChoice.outcome);
  });
});
```

### 1.3 Offline Mode Tests
```typescript
describe('Offline Functionality', () => {
  test('app працює офлайн', async () => {
    // Simulate offline
    await page.context().setOffline(true);
    
    await page.goto('http://localhost:5174');
    const title = await page.title();
    expect(title).toBe('BreedHub');
  });

  test('показує офлайн індикатор', async () => {
    await page.context().setOffline(true);
    const indicator = await page.locator('[data-testid="offline-indicator"]');
    await expect(indicator).toBeVisible();
  });
});
```

### Playground Tests для Фази 1:
- [ ] PWA installable на desktop
- [ ] PWA installable на mobile
- [ ] Service Worker активний
- [ ] Офлайн сторінка працює
- [ ] Static files кешуються
- [ ] Install prompt з'являється

---

## Фаза 2: Supabase Replication Testing

### 2.1 Sync Tests
```typescript
describe('Supabase Synchronization', () => {
  test('pull - отримання даних з Supabase', async () => {
    const replication = await setupSupabaseReplication(db);
    await replication.start();
    
    // Додати тестові дані в Supabase
    await supabase.from('breeds').insert({ id: 'test', name: 'Test Breed' });
    
    // Почекати синхронізацію
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const localDoc = await db.breeds.findOne('test').exec();
    expect(localDoc.name).toBe('Test Breed');
  });

  test('push - відправка даних в Supabase', async () => {
    await db.breeds.insert({ id: 'local', name: 'Local Breed' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data } = await supabase.from('breeds').select().eq('id', 'local');
    expect(data[0].name).toBe('Local Breed');
  });
});
```

### 2.2 Conflict Resolution Tests
```typescript
describe('Conflict Resolution', () => {
  test('last-write-wins strategy', async () => {
    // Створити конфлікт
    const doc1 = { id: '1', name: 'Breed A', updatedAt: '2024-01-01' };
    const doc2 = { id: '1', name: 'Breed B', updatedAt: '2024-01-02' };
    
    const resolved = conflictHandler.onConflict(doc1, doc2);
    expect(resolved.name).toBe('Breed B');
  });

  test('merge arrays strategy', async () => {
    const local = { tags: ['a', 'b'] };
    const remote = { tags: ['b', 'c'] };
    
    const merged = conflictHandler.mergeFields.tags(local.tags, remote.tags);
    expect(merged).toEqual(['a', 'b', 'c']);
  });
});
```

### 2.3 Performance Tests
```typescript
describe('Sync Performance', () => {
  test('batch sync 1000 documents', async () => {
    const startTime = performance.now();
    
    // Додати 1000 документів
    const docs = Array.from({ length: 1000 }, (_, i) => ({
      id: `breed-${i}`,
      name: `Breed ${i}`
    }));
    
    await db.breeds.bulkInsert(docs);
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(5000); // < 5 секунд
  });
});
```

### Playground Tests для Фази 2:
- [ ] Дані синхронізуються з Supabase
- [ ] Офлайн зміни зберігаються локально
- [ ] При відновленні зв'язку дані синхронізуються
- [ ] Конфлікти вирішуються автоматично
- [ ] Sync status відображається в UI
- [ ] Помилки синхронізації логуються

---

## Фаза 3: UI Testing

### 3.1 Offline Indicator Tests
```typescript
describe('Offline UI', () => {
  test('індикатор змінює стан', async () => {
    const indicator = screen.getByTestId('offline-indicator');
    
    // Online
    expect(indicator).toHaveClass('online');
    
    // Go offline
    window.dispatchEvent(new Event('offline'));
    expect(indicator).toHaveClass('offline');
  });
});
```

### 3.2 Optimistic Updates Tests
```typescript
describe('Optimistic UI', () => {
  test('миттєве оновлення UI', async () => {
    const breedsList = screen.getByTestId('breeds-list');
    const addButton = screen.getByText('Add Breed');
    
    fireEvent.click(addButton);
    
    // UI оновлюється миттєво
    expect(breedsList.children).toHaveLength(1);
    
    // Дані зберігаються в background
    await waitFor(() => {
      expect(db.breeds.count()).toBe(1);
    });
  });
});
```

### Playground Tests для Фази 3:
- [ ] Офлайн індикатор працює
- [ ] Optimistic updates миттєві
- [ ] Rollback при помилках
- [ ] Loading states коректні
- [ ] Error messages зрозумілі
- [ ] Conflict UI зручний

---

## Фаза 4: Gemma AI Testing (опційно)

### 4.1 Model Loading Tests
```typescript
describe('Gemma AI', () => {
  test('модель завантажується', async () => {
    const gemma = new GemmaService();
    await gemma.initialize();
    expect(gemma.isReady).toBe(true);
  });

  test('WebGPU доступний', () => {
    const hasWebGPU = 'gpu' in navigator;
    expect(hasWebGPU).toBe(true);
  });
});
```

### 4.2 AI Features Tests
```typescript
describe('AI Commands', () => {
  test('парсинг команд', async () => {
    const command = 'додай вагу Макса 450г';
    const parsed = await gemma.parseCommand(command);
    
    expect(parsed).toEqual({
      action: 'weight',
      name: 'Макс',
      value: 450
    });
  });
});
```

### Playground Tests для Фази 4:
- [ ] Gemma модель завантажується
- [ ] WebGPU працює (або fallback на CPU)
- [ ] Natural language команди працюють
- [ ] Breeding recommendations генеруються
- [ ] Performance прийнятний (>10 tokens/s)

---

## Фаза 5: Migration Testing

### 5.1 Data Migration Tests
```typescript
describe('MultiStore to RxDB Migration', () => {
  test('всі дані мігрують', async () => {
    const oldCount = multiStore.getAllEntities().length;
    
    await migrateToRxDB();
    
    const newCount = await db.breeds.count().exec();
    expect(newCount).toBe(oldCount);
  });

  test('структура даних зберігається', async () => {
    const oldBreed = multiStore.getEntity('breed-1');
    await migrateToRxDB();
    
    const newBreed = await db.breeds.findOne('breed-1').exec();
    expect(newBreed.toJSON()).toMatchObject(oldBreed);
  });
});
```

### Playground Tests для Фази 5:
- [ ] Старі дані доступні після міграції
- [ ] Нові features працюють
- [ ] Performance не погіршився
- [ ] Backward compatibility працює
- [ ] Rollback можливий

---

## 📊 Performance Benchmarks

### Цільові метрики:
| Метрика | Ціль | Критичний поріг |
|---------|------|-----------------|
| Time to Interactive | < 3s | < 5s |
| First Contentful Paint | < 1s | < 2s |
| Offline response | < 10ms | < 50ms |
| Sync latency | < 1s | < 3s |
| Memory usage | < 100MB | < 200MB |
| DB query time | < 50ms | < 200ms |

### Як тестувати:
```typescript
// Performance monitoring
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});

observer.observe({ entryTypes: ['measure'] });

// Вимірювання
performance.mark('rxdb-query-start');
const results = await db.breeds.find().exec();
performance.mark('rxdb-query-end');
performance.measure('rxdb-query', 'rxdb-query-start', 'rxdb-query-end');
```

---

## 🔄 Continuous Testing Strategy

### Pre-commit hooks:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit && npm run lint"
    }
  }
}
```

### CI/CD Pipeline:
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:integration
      - run: pnpm test:e2e
```

### Daily Testing Checklist:
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Playground demos work
- [ ] Offline mode works
- [ ] Sync works
- [ ] No console errors
- [ ] Performance metrics в межах норми