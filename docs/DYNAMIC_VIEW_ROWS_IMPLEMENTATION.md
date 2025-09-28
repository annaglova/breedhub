# Dynamic View Rows Implementation & Data Sync Strategy

## ПОТОЧНИЙ СТАН ПРОЕКТУ

### ✅ Що вже зроблено

#### 1. Динамічна генерація схем RxDB
- **Реалізовано**: Повністю динамічна генерація схем з конфігурації
- **Файл**: `/packages/rxdb-store/src/stores/space-store.signal-store.ts`
- **Функція**: `generateSchemaForEntity()` - lines 549-680
- Схема генерується з:
  - `fields` - основні поля сутності
  - `sort_fields` - поля для сортування
  - `filter_fields` - поля для фільтрації

#### 2. Універсальний лоадер даних
- **Реалізовано**: Універсальний метод `loadEntityData(entityType, limit)`
- **Файл**: `/packages/rxdb-store/src/stores/space-store.signal-store.ts`
- **Функція**: `loadEntityData()` - lines 1084-1180
- Динамічний мапінг полів на основі схеми колекції
- Автоматичне перетворення `deleted` → `_deleted`

#### 3. Виправлення UI конфігурацій
- ViewChanger правильно читає конфігурацію з БД
- SpaceComponent коректно відображає UI елементи
- Reactive signals для динамічних конфігурацій

### ⚠️ Де залишився хардкод

1. **Виклик loadEntityData при ініціалізації**
   - Файл: `/packages/rxdb-store/src/stores/space-store.signal-store.ts`
   - Рядок: 183 - `this.loadEntityData('breed')`
   - Тимчасово завантажує тільки breed

2. **Кількість rows в SpaceComponent**
   - Файл: `/apps/app/src/components/space/SpaceComponent.tsx`
   - Рядки: 78-79 - `rows: 50` захардкоджено

3. **Mock дані в useBreeds**
   - Файл: `/apps/app/src/hooks/useBreeds.ts`
   - Використовує mock дані замість RxDB

## ДЕТАЛЬНИЙ ПЛАН РОЗВИТКУ

### ФАЗА 1: ПОКРАЩЕНИЙ ЛОАДІНГ З РЕПЛІКАЦІЄЮ (ПРІОРИТЕТ 1)

#### Завдання 1.1: Базова двостороння синхронізація
**Мета**: Реалізувати надійну синхронізацію з обробкою конфліктів

**Файли для створення/зміни:**
```typescript
// /packages/rxdb-store/src/services/entity-replication.service.ts
export class EntityReplicationService {
  private replicationStates: Map<string, RxReplicationState> = new Map();

  async setupReplication(entityType: string, options: ReplicationOptions) {
    // 1. Push handler - відправка змін в Supabase
    const pushHandler = async (changeEvent) => {
      const { newDocument, assumedMasterState } = changeEvent;
      // Відправити зміни в Supabase
      // Обробити конфлікти версій
    };

    // 2. Pull handler - отримання змін з Supabase
    const pullHandler = async (lastCheckpoint) => {
      // Отримати зміни з Supabase з останньої синхронізації
      // Використати updated_at для checkpoint
    };

    // 3. Конфлікт резолюція
    const conflictHandler = async (conflict) => {
      // Стратегія: last-write-wins або custom merge
      // Базуватись на updated_at або версії
    };
  }
}
```

**Кроки реалізації:**
1. Створити EntityReplicationService на основі books-replication.service
2. Додати обробку конфліктів (last-write-wins за updated_at)
3. Реалізувати checkpoint механізм для інкрементального завантаження
4. Додати retry логіку для network failures
5. Інтегрувати з SpaceStore

#### Завдання 1.2: Realtime підписки
**Мета**: Отримувати оновлення в реальному часі

```typescript
// Використати Supabase Realtime
async setupRealtimeSync(entityType: string) {
  const channel = supabase
    .channel(`${entityType}_changes`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: entityType },
      (payload) => this.handleRealtimeChange(payload)
    )
    .subscribe();
}
```

#### Завдання 1.3: Оптимістичні оновлення
**Мета**: Миттєва реакція UI без очікування серверу

```typescript
// При локальній зміні:
1. Одразу оновити RxDB (оптимістично)
2. Відправити на сервер в фоні
3. При помилці - відкатити зміни
4. При конфлікті - вирішити через conflictHandler
```

### ФАЗА 2: ДИНАМІЧНЕ ЗАВАНТАЖЕННЯ ЧЕРЕЗ КОНФІГ (ПРІОРИТЕТ 2)

#### Завдання 2.1: Читання rows з view конфігурації
**Файл**: `/packages/rxdb-store/src/stores/space-store.signal-store.ts`

```typescript
// Додати методи:
getViewConfig(entityType: string, viewType: string): ViewConfig | null {
  const spaceConfig = this.spaceConfigs.get(entityType);
  return spaceConfig?.views?.[viewType];
}

getRowsForView(entityType: string, viewType: string): number {
  const viewConfig = this.getViewConfig(entityType, viewType);
  return viewConfig?.rows || 50; // default fallback
}
```

#### Завдання 2.2: Інтеграція з SpaceComponent
**Файл**: `/apps/app/src/components/space/SpaceComponent.tsx`

```typescript
// Замінити хардкод:
const viewMode = searchParams.get("view") || config.viewConfig[0].id;
const rowsPerPage = spaceStore.getRowsForView(
  config.entitySchemaName,
  viewMode
);

const { data } = useEntitiesHook({
  rows: rowsPerPage, // динамічно з конфігу
  from: page * rowsPerPage,
});
```

#### Завдання 2.3: Пагінація з різними rows
- Скидати page при зміні view
- Перераховувати offset при новому rows значенні
- Оптимізувати кешування для різних views

### ФАЗА 3: UI ІНТЕГРАЦІЯ З RXDB (ПРІОРИТЕТ 3)

#### Завдання 3.1: Заміна mock даних на RxDB
**Файл**: `/apps/app/src/hooks/useBreeds.ts`

```typescript
export function useBreeds(params: { rows?: number; from?: number }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Підписатися на RxDB колекцію
    const sub = spaceStore.db?.breed
      ?.find()
      .skip(params.from || 0)
      .limit(params.rows || 50)
      .$.subscribe(docs => {
        setData(docs.map(d => d.toJSON()));
      });

    // Отримати total count
    spaceStore.db?.breed?.count().exec()
      .then(count => setTotal(count));

    return () => sub?.unsubscribe();
  }, [params.from, params.rows]);

  return { data: { entities: data, total }, isLoading: false };
}
```

#### Завдання 3.2: Reactive оновлення через Signals
- Використати Preact Signals для реактивності
- Автоматичне оновлення UI при змінах в RxDB
- Оптимізація ререндерів

#### Завдання 3.3: VirtualSpaceView оптимізація
- Динамічні itemHeight для різних views
- Адаптивний overscan
- Збереження scroll позиції

## ПРІОРИТЕТНІСТЬ ЗАДАЧ

### Критичні (блокують продакшн):
1. **EntityReplicationService** - без цього немає синхронізації
2. **Conflict resolution** - критично для multi-user
3. **Заміна mock на RxDB** - реальні дані

### Важливі (покращують UX):
1. **Динамічні rows** - оптимізація performance
2. **Realtime sync** - миттєві оновлення
3. **Optimistic updates** - швидкий відгук

### Бажані (nice to have):
1. **Offline mode** - робота без інтернету
2. **Sync status UI** - індикатор синхронізації
3. **Conflict UI** - ручне вирішення конфліктів

## ТЕХНІЧНА АРХІТЕКТУРА

```
┌─────────────────┐
│   Supabase DB   │
└────────┬────────┘
         │ Realtime + REST
┌────────▼────────┐
│ Replication Svc │ ← Conflict Resolution
└────────┬────────┘
         │
┌────────▼────────┐
│   RxDB Store    │ ← Local IndexedDB
└────────┬────────┘
         │ Reactive Signals
┌────────▼────────┐
│  UI Components  │
└─────────────────┘
```

## МЕТРИКИ УСПІХУ

- [ ] Дані синхронізуються між клієнтами < 1 сек
- [ ] Конфлікти вирішуються автоматично в 95% випадків
- [ ] UI оновлюється миттєво при локальних змінах
- [ ] Працює offline з подальшою синхронізацією
- [ ] Views завантажують правильну кількість rows
- [ ] Performance: Initial load < 500ms
- [ ] Memory: < 100MB для 10k записів

## НАСТУПНІ КРОКИ

1. **Зараз**: Почати з EntityReplicationService (ФАЗА 1.1)
2. **Цей тиждень**: Базова синхронізація + conflict resolution
3. **Наступний тиждень**: Динамічні rows + UI інтеграція

## ПОСИЛАННЯ НА КОД

- SpaceStore: `/packages/rxdb-store/src/stores/space-store.signal-store.ts`
- SpaceComponent: `/apps/app/src/components/space/SpaceComponent.tsx`
- Books Replication (приклад): `/packages/rxdb-store/src/services/books-replication.service.ts`
- UseBreeds Hook: `/apps/app/src/hooks/useBreeds.ts`