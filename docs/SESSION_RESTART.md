# 🔄 SESSION RESTART - BREEDHUB PROJECT

## 📅 Дата сесії: 2025-09-29

## 🎯 ПОТОЧНИЙ СТАН РОБОТИ

### Що робимо зараз:
1. **Заміна mock даних на RxDB** - інтеграція useBreeds hook з реальними даними з RxDB колекції
2. **Тестування реплікації** - перевірка роботи з іншими entity types (animals, users)
3. **Sync status indicator** - додавання індикатора синхронізації в UI

### Останні завершені задачі:
- ✅ Реалізована повноцінна двостороння реплікація даних (EntityReplicationService)
- ✅ Видалено deprecated SupabaseLoaderService
- ✅ Налаштована realtime синхронізація з Supabase
- ✅ Перейменовано VirtualSpaceView → SpaceView

### Поточний контекст:
- Працює реплікація для entity type "breed" (завантажує 100 записів batch-ами)
- Mock дані використовують поля: id, name, pet_profile_count, kennel_count, patron_count, achievement_progress, has_notes, avatar_url, top_patrons
- Потрібно замінити mock на реальні дані з RxDB колекції

## 📚 КЛЮЧОВА ДОКУМЕНТАЦІЯ

### Архітектура та плани:
- `/docs/PROPERTY_BASED_CONFIG_ARCHITECTURE.md` - Архітектура конфігураційної системи на основі properties
- `/docs/SPACE_STORE_ARCHITECTURE.md` - Детальна архітектура SpaceStore та робота з entities
- `/docs/ENTITY_STORE_IMPLEMENTATION_PLAN.md` - План впровадження Entity Store pattern
- `/docs/STORE_ARCHITECTURE.md` - Загальна архітектура store системи
- `/docs/DYNAMIC_VIEW_ROWS_IMPLEMENTATION.md` - План роботи з динамічними views та реплікацією
- `/docs/STORE_CREATION_GUIDE.md` - Гайд по створенню stores

### Технічні деталі:
- `/docs/RXDB_INTEGRATION.md` - Інтеграція з RxDB
- `/docs/SUPABASE_SYNC.md` - Синхронізація з Supabase (якщо є)

## 🔧 ОСНОВНІ ФАЙЛИ ДЛЯ РОБОТИ

### Stores і Сервіси:
```
/packages/rxdb-store/src/
├── stores/
│   ├── space-store.signal-store.ts    # Основний store для entities
│   ├── app-store.signal-store.ts      # App store
│   └── base/entity-store.ts           # Базовий EntityStore клас
├── services/
│   ├── entity-replication.service.ts  # Універсальний сервіс реплікації
│   └── database.service.ts            # RxDB database service
```

### UI Компоненти:
```
/apps/app/src/
├── components/space/
│   ├── SpaceComponent.tsx     # Основний компонент простору
│   ├── SpaceView.tsx          # View для відображення entities
│   └── ViewChanger.tsx        # Перемикач views
├── hooks/
│   └── useBreeds.ts           # Hook з mock даними (потрібно замінити)
├── mocks/
│   └── breeds.mock.ts         # Mock дані breeds
```

## 🚀 КОМАНДИ ДЛЯ ЗАПУСКУ

```bash
# Основний dev server
npm run dev

# Або окремо app
cd apps/app
pnpm run dev:app

# Якщо потрібно очистити
rm -rf node_modules
npm install
```

## 🔍 ВАЖЛИВІ ДЕТАЛІ РЕАЛІЗАЦІЇ

### EntityReplicationService:
- Pull handler з checkpoint механізмом
- Batch size: 100 записів
- Pull interval: 5 секунд (для development)
- Realtime subscription через Supabase channels
- Conflict resolution: last-write-wins
- Мапінг полів: `deleted` ↔ `_deleted`

### SpaceStore:
- Динамічна генерація RxDB схем з конфігурації
- Метод `setupEntityReplication()` для налаштування синхронізації
- Зберігає entity stores в Map структурі
- Працює з signals для реактивності

### Поточна проблема з mock даними:
`useBreeds` hook використовує mock дані замість RxDB. Потрібно:
1. Підписатися на RxDB колекцію `breed`
2. Трансформувати дані в потрібний формат
3. Забезпечити реактивне оновлення

## 📝 TODO ПІСЛЯ РЕСТАРТУ

1. **Негайно**: Заміна mock даних на RxDB в useBreeds
2. **Далі**: Динамічні rows з view конфігурації
3. **Потім**: Тестування з іншими entity types
4. **Опціонально**: Sync status indicator

## 🐛 ВІДОМІ ПРОБЛЕМИ

1. Завантажується тільки 100 breeds замість 452 (batch limitation - не критично)
2. Mock дані все ще використовуються в UI
3. Динамічні rows поки захардкоджені на 50

## 💡 КОРИСНІ НОТАТКИ

- Реплікація працює автоматично при створенні колекції
- Дані синхронізуються в обидва боки (RxDB ↔ Supabase)
- Realtime оновлення працюють через Supabase channels
- Всі зміни в RxDB автоматично синхронізуються

## 🔗 GITHUB BRANCH

Поточна гілка: `debug/ui-cascade-issue`

## 📌 КОНТЕКСТ ДЛЯ AI АСИСТЕНТА

При продовженні роботи, звернути увагу на:
1. Архітектурне рішення: EntityStore залишається чистим, SpaceStore керує реплікацією
2. Потік даних: Supabase ↔ EntityReplicationService ↔ RxDB ↔ SpaceStore → EntityStore → UI
3. Використовуємо Preact signals для реактивності
4. Batch processing по 100 записів - це ОК, не треба фіксити

---

**Останній коміт**: "refactor: remove deprecated loader and improve replication performance"

**Статус проекту**: Реплікація працює, потрібна інтеграція з UI через RxDB замість mock даних.