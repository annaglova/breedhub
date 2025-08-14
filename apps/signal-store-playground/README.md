# SignalStore Playground

## 🚀 Як запустити

```bash
# З кореня проекту
pnpm dev:playground

# Або
cd apps/signal-store-playground
pnpm dev
```

Відкрийте http://localhost:5174

## 🧪 Як тестувати стори

### 1. **Test Page** (`/test`) - Автоматичні тести
Найпростіший спосіб перевірити, що все працює:
- Натисніть "Test SignalStore" - перевірить базові CRUD операції
- Натисніть "Test MultiStore" - перевірить ієрархію та валідацію
- Натисніть "Test Reactivity" - перевірить реактивність

### 2. **MultiStore** (`/multistore`) - Інтерактивна демка
Повноцінна демонстрація MultiStore:
- **Дерево entities** - візуалізація ієрархії
- **Додати entity** - натисніть "+" і виберіть тип
- **Видалити** - виберіть entity і натисніть кошик
- **Експорт/Імпорт** - збереження та відновлення стану
- **Валідація** - натисніть ✓ для перевірки

### 3. **Entities** (`/entities`) - CRUD операції
Тестування базових операцій:
- Додавання продуктів
- Редагування (клік на продукт)
- Видалення
- Вибір декількох

### 4. **Filtering** (`/filtering`) - Фільтрація та пошук
- Пошук по назві
- Фільтр по категорії
- Фільтр по ціні
- Комбіновані фільтри

### 5. **Hierarchy** (`/hierarchy`) - Ієрархічна структура
Демонстрація старої архітектури з workspace → space → view → data

### 6. **Sync** (`/sync`) - IndexedDB синхронізація
- Додавання задач
- Автоматична синхронізація
- Офлайн/онлайн режими
- Імітація серверної синхронізації

## 📊 Що перевіряти

### SignalStore повинен:
✅ Створювати entities
✅ Оновлювати entities
✅ Видаляти entities
✅ Фільтрувати дані
✅ Реагувати на зміни (re-render)

### MultiStore повинен:
✅ Валідувати типи entities
✅ Зберігати parent-child зв'язки
✅ Каскадно видаляти дочірні entities
✅ Експортувати/імпортувати стан
✅ Запобігати циклічним посиланням

## 🐛 Якщо щось не працює

### 1. Перевірте консоль браузера
Відкрийте DevTools (F12) і подивіться на помилки

### 2. Перебудуйте пакет
```bash
cd packages/signal-store
pnpm build
```

### 3. Перезапустіть playground
```bash
# Ctrl+C для зупинки
pnpm dev:playground
```

### 4. Очистіть кеш
```bash
rm -rf node_modules/.vite
pnpm install
```

## 💡 Швидкий тест в консолі

Відкрийте консоль браузера на будь-якій сторінці playground:

```javascript
// Імпортуйте з window (якщо доступно)
const { createSignalStore, withEntities } = await import('@breedhub/signal-store');

// Створіть стор
const useStore = createSignalStore('test', [withEntities()]);
const store = useStore();

// Тестуйте
store.addEntity({ id: '1', name: 'Test' });
console.log(store.computed.entities);
store.removeEntity('1');
```

## 📁 Структура проекту

```
apps/signal-store-playground/
├── src/
│   ├── examples/        # Приклади використання
│   │   ├── MultiStoreExample.tsx
│   │   ├── EntitiesExample.tsx
│   │   └── ...
│   ├── pages/           # Сторінки роутера
│   │   ├── TestPage.tsx        # Автоматичні тести
│   │   ├── MultiStorePage.tsx  # MultiStore демо
│   │   └── ...
│   └── App.tsx          # Головний компонент
```

## 🔄 Основні концепції

### SignalStore
- Базовий стор з features (entities, filtering, etc.)
- Використовує Zustand для state management
- Підтримує composition через features

### MultiStore
- Всі дані - це entities з типом
- Строга ієрархія через _parentId
- Валідація на рівні типів та runtime
- Єдиний стор для всього

### Features
- `withEntities` - CRUD операції
- `withFiltering` - пошук та фільтри
- `withRelationships` - зв'язки між entities
- `withRequestStatus` - стан завантаження

## 🎯 Наступні кроки

1. **Перевірте тести** на `/test`
2. **Пограйтеся з MultiStore** на `/multistore`
3. **Спробуйте CRUD** на `/entities`
4. **Перевірте синхронізацію** на `/sync`

Якщо все працює - можна починати інтеграцію в основний додаток!