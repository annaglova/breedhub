# 🚨 CURRENT WORK SESSION - RxDB + Supabase Sync Testing

## 📍 Current Status (22 серпня 2025)

### ✅ ВАЖЛИВО: Перейшли на нову таблицю `books`!
**Таблицю `breed` залишили в спокої - там забагато тестових даних**

### 📚 Нова тестова таблиця: `books`
**http://localhost:5174/books-rxdb**
- Файл: `/apps/signal-store-playground/src/pages/BooksRxDBPage.tsx`
- SQL міграція: `/supabase/migrations/create_books_test_table.sql`
- Це головна точка входу для всього тестування

### 🏗️ Архітектура:
1. **RxDB** - локальна база даних (IndexedDB через Dexie)
2. **Supabase** - віддалена PostgreSQL база 
3. **Preact Signals** - для реактивності без ре-рендерів React
4. **Автоматична синхронізація** - двостороння між RxDB і Supabase

---

## 🔧 Основні компоненти:

### 1. База даних і схема
- **Схема**: `/packages/rxdb-store/src/collections/books.schema.ts` (версія 0)
- **Типи**: `/packages/rxdb-store/src/types/book.types.ts`
- **Поля в таблиці**:
  ```typescript
  {
    id: string (UUID в Supabase - crypto.randomUUID()),
    title: string,
    author: string,
    isbn?: string,
    genre?: string,
    year?: number,
    pages?: number,
    rating?: number (0-5),
    available: boolean,
    description?: string,
    tags: string[],
    metadata: object,
    accountId?: string,
    spaceId?: string,
    createdAt: string (ISO date),
    updatedAt: string (ISO date),
    _deleted?: boolean
  }
  ```

### 2. Сервіс синхронізації
- **Файл**: `/packages/rxdb-store/src/services/books-replication.service.ts`
- **Ключові методи**:
  - `setupBooksReplication()` - налаштовує двосторонню синхронізацію
  - `fetchBooksFromSupabase()` - ручне завантаження даних
  - `deleteTestBooks()` - видаляє тестові книжки з Supabase
  - Rate limiting та connection pooling для захисту Supabase

### 3. State Management (Preact Signals)
- **Файл**: `/packages/rxdb-store/src/stores/books.signal-store.ts`
- **Особливості**:
  - Показує ВСІ книжки (без лімітів, відсортовані по даті оновлення)
  - Автоматична підписка на зміни RxDB
  - Методи: `addBook()`, `updateBook()`, `deleteBook()`, `enableSync()`, `disableSync()`
  - Лічильники: totalCount, availableCount

### 4. UI Компоненти
- **BooksListWithSignals**: `/packages/rxdb-store/src/components/BooksListWithSignals.tsx`
  - Використовує Preact Signals
  - БЕЗ лімітів - показує всі книжки
  - Форма додавання: всі поля книжки
  - Inline редагування
  - Soft delete через _deleted field

---

## ⚠️ КРИТИЧНІ ПРОБЛЕМИ, ЯКІ МИ ВИРІШИЛИ:

### 1. ✅ Infinite sync loop
- **Проблема**: Безкінечний цикл синхронізації (50,000+ операцій)
- **Рішення**: Використовуємо checkpoint.pulled = true після першого pull
- **Де**: `supabase-replication.service.ts` рядки 181-187

### 2. ✅ Неправильне мапінг полів
- **Проблема**: Різні назви полів в RxDB і Supabase
- **Рішення**: Прямий мапінг в pull/push handlers
  ```
  RxDB -> Supabase:
  _deleted -> deleted
  workspaceId -> account_id
  
  Supabase -> RxDB:
  deleted -> _deleted
  account_id -> workspaceId
  ```

### 3. ✅ Schema версії
- **Проблема**: Конфлікти версій схеми (DXE1, DB6 помилки)
- **Рішення**: Міграції в `breeds.schema.ts`, зараз версія 4

### 4. ✅ ВИРІШЕНО - Перевантаження Supabase
- **Проблема**: Занадто багато запитів "клали" Supabase
- **Рішення**: 
  - Rate limiting (max 3 паралельні запити)
  - Збільшили retryTime до 30 секунд
  - Зменшили batch size до 20
  - Додали connection pooling
  - Proper cleanup при зупинці sync

---

## 🎯 Що працює:

1. ✅ **Локальне додавання/редагування/видалення** в RxDB
2. ✅ **Завантаження даних з Supabase** (топ 20 порід)
3. ✅ **Push нових записів в Supabase** 
4. ✅ **Preact Signals реактивність** без ре-рендерів
5. ✅ **Автоматична синхронізація** при включенні "Enable Supabase Sync"
6. ✅ **Сортування по даті оновлення** (найновіші зверху)

---

## 🔴 Відомі особливості RxDB:

1. ℹ️ **IndexedDB основна колекція не оновлюється візуально** - RxDB використовує lazy writing, актуальні дані в пам'яті та індексних колекціях
2. ℹ️ **`_deleted: "0"` після soft delete** - нормальна поведінка RxDB, запис переміщується в колекцію deleted
3. ℹ️ **Real-time subscription** - вимкнено для стабільності
4. ℹ️ **Cleanup політика** - видалені записи зберігаються 1 годину перед остаточним видаленням

---

## 🛠️ Кнопки в UI для тестування:

### Основні:
- **Enable/Disable Supabase Sync** - включає/вимикає автоматичну синхронізацію
- **Add Test Books** - додає 5 тестових книжок (програмування тематика)
- **Clear All Books** - чистить локальну RxDB
- **Reset Database** - повністю видаляє і перестворює базу
- **Clean ALL DBs** - агресивна очистка ВСІХ IndexedDB баз

### Supabase Operations (жовта секція):
- **Fetch Books from Supabase** - завантажує книжки з Supabase
- **Delete Test Books from Supabase** - видаляє тестові книжки

---

## 📝 Конфігурація:

### Environment:
```
VITE_SUPABASE_URL=https://dev.dogarray.com:8020
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Запуск:
```bash
pnpm dev:playground
```
Відкрити: http://localhost:5174/breeds-rxdb

---

## 🚀 Наступні кроки:

1. Вирішити проблему з видаленням пустих записів в Supabase
2. Включити real-time subscription після стабілізації
3. Додати більше полів для синхронізації (якщо потрібно)
4. Оптимізувати performance для великих обсягів даних

---

## 💡 Важливі нотатки:

- Таблиця називається `books` (замість breed)
- ID в Supabase - це UUID через `crypto.randomUUID()`
- Завжди використовувати soft delete через _deleted field
- При помилках схеми - використовувати "Reset DB" або "Clean ALL DBs"
- RxDB зберігає видалені записи для синхронізації - це нормально
- Основна колекція IndexedDB може не показувати зміни візуально - дивіться індексні колекції

---

## 🐛 Для дебагу дивись консоль браузера:

Всі операції логуються з префіксами:
- `[BooksStore]` - операції стору з Signals
- `[BooksReplication]` - синхронізація
- `[BooksRxDBPage]` - головна сторінка
- `[DatabaseService]` - операції з базою

---

## ✅ Протестовано і працює:

1. **CRUD операції** - Create, Read, Update, Delete працюють коректно
2. **Синхронізація** - двостороння між RxDB і Supabase
3. **UI реактивність** - Preact Signals оновлюють UI миттєво
4. **Soft delete** - правильно позначає як deleted в Supabase
5. **UUID генерація** - використовуємо crypto.randomUUID()
6. **Rate limiting** - захист Supabase від перевантаження

---

**ОСТАННЄ ОНОВЛЕННЯ**: 22 серпня 2025, 17:00
**СТАТУС**: Базовий функціонал працює! Потрібно протестувати офлайн сценарії та edge cases