# 📋 TODO - BreedHub Active Tasks

**Last Updated:** 2025-12-25

---

## 🚧 ПОТОЧНА РОБОТА

### Extensions Architecture - Child Tables Implementation

**Статус:** In Progress

**Документація:** [CHILD_TABLES_IMPLEMENTATION_PLAN.md](./CHILD_TABLES_IMPLEMENTATION_PLAN.md)

**Задачі:**
- [ ] Додати логіку збору extensions в `parseSpaceConfigurations()`
- [ ] Створити `generateChildSchemaFromExtensions()` метод
- [ ] Розширити `ensureCollection()` для підтримки `_children` колекцій
- [ ] Додати `queryExtensionRecords()` метод в SpaceStore
- [ ] Тестування з реальними extensions конфігами

**Архітектура:**
```javascript
space: {
  entitySchemaName: "breed",

  fields: {
    // Main entity fields (source of truth для RxDB schema)
  },

  extensions: {
    "breed_extension_top_patrons": {
      tableName: "breed_top_patrons",  // Окрема таблиця
      fields: {
        id: {...},
        breed_id: {...},     // FK to parent
        patron_id: {...},
        rank: {...}
      }
    },
    "breed_extension_measurements": {
      tableName: "breed_measurements",
      fields: {...}
    }
  }
}
```

**RxDB Collections:**
- `db.breed` - основна таблиця
- `db.breed_children` - ВСІ дочірні таблиці для breed (union schema)
- Meta fields: `_table_type`, `_parent_id`

**Принципи:**
- Extension = завжди окрема таблиця (не JSONB поле)
- Tab може використовувати extension через reference
- Extensions в корені space (не в tabs)
- Union schema - всі поля з усіх extensions в одній колекції

---

## 📅 НАСТУПНІ ФАЗИ

### Phase 3 - Navigation & Tab Content (After Extensions)

**Estimated:** 1 week

- [ ] Навігаційні кнопки (expand/fullscreen, prev/next)
- [ ] Tab content components (DetailsTab, etc.)
- [ ] Child tables інтеграція в tabs через extensions
- [ ] Підключення реальних даних замість моків

---

## 🟡 ПРІОРИТЕТ 1: PWA Phase 2

**Статус:** Optional (Phase 1 Complete)

**Що можна додати:**
- [ ] Custom offline page (зараз fallback на index.html)
- [ ] Deeper RxDB integration в Service Worker
- [ ] Cache strategy optimization
- [ ] Install prompt UI

**Estimated:** 4-6 годин

**Документація:** `/docs/LOCAL_FIRST_ROADMAP.md` - Phase 1

---

## 🟡 ПРІОРИТЕТ 2: Performance Optimization

**Статус:** Optional

**Можливі покращення:**
- [ ] Performance metrics (cache hit rate tracking)
- [ ] Bundle size optimization
- [ ] Lazy loading для non-critical components
- [ ] Virtual scrolling для великих списків

**Estimated:** Varies

---

## 🟢 ПРІОРИТЕТ 3: Edge Cases

**Статус:** Low Priority

**Складні сценарії:**
- [ ] Complex filter scenarios (OR/AND logic)
- [ ] Special operators (IN, BETWEEN, NOT IN)
- [ ] Nested JSONB filtering
- [ ] Date range filtering with timezone

**Note:** Додаються по мірі виникнення, не критичні зараз

**Estimated:** Incremental

---

## 🔮 МАЙБУТНІ ПОКРАЩЕННЯ (з LOCAL_FIRST_ROADMAP.md)

### EntityStore Future Enhancements (Phase 3+)
- [ ] Pagination support in EntityStore
- [ ] Virtual scrolling integration
- [ ] Optimistic updates
- [ ] Undo/Redo support
- [ ] Batch update optimization

### ✅ Phase 3.0: Redux Cleanup (COMPLETED 01.12.2025)
**Goal:** Remove Redux/RTK Query in favor of Preact Signals

- [x] Audit all Redux usage in the codebase
- [x] Remove Redux dependencies from package.json (@reduxjs/toolkit, react-redux)
- [x] Remove /store folder with Redux code
- [x] Replace loading state with signals-based loadingStore
- [x] Update components to use Preact Signals
- [x] Clean up unused Redux-related imports

**What Was Done:**
1. Created `loadingStore` using Preact Signals
2. Created LoadingBar component using signals
3. Updated useLoadingBar hook to use signals instead of Redux
4. Removed Redux Provider from App.tsx
5. Deleted entire /store folder with Redux code
6. Removed @reduxjs/toolkit and react-redux from package.json

---

## 🚀 QUICK WINS (Can be done in parallel)

### Component Refactoring

#### Universal EntityAvatar (замість BreedAvatar)
**Статус:** TODO

**Проблема:** `BreedAvatar` не є breed-specific, логіка універсальна для всіх entity types.

**Архітектура:**
- `AvatarOutlet` - layout, positioning (-mt-32), action buttons (Edit, More)
- `EntityAvatar` - рендеринг аватара + badges (окремий компонент для reusability)

**Фаза 1 - Universal Avatar (зараз):**
- [ ] Переіменувати `BreedAvatar` → `EntityAvatar`
- [ ] Перенести в `components/shared/` або `components/template/`
- [ ] Avatar URL resolution - universal logic (avatar_url, image, logo_url з fallback)
- [ ] Оновити ComponentRegistry
- [ ] Видалити breed-specific код (TopPet, BreedPatronage - це для badges)

**Фаза 2 - Avatar Badges (пізніше):**
- [ ] Badge slot/overlay система в EntityAvatar
- [ ] Config-driven badges через `blockConfig.badges`
- [ ] Імплементувати badges по entity type:
  - **Pet**: "Top Pet" badge (trophy icon) - якщо пет є топом породи
  - **Contact**: Patronage badges з місцем (1st, 2nd, 3rd)
  - **Kennel**: Verified badge
  - **Breed**: TBD

**Приклад конфігу (Фаза 2):**
```json
{
  "outlet": "AvatarOutlet",
  "component": "EntityAvatar",
  "badges": {
    "topPet": { "field": "is_top_pet", "icon": "trophy" },
    "patronage": { "field": "Patronage", "showPlace": true },
    "verified": { "field": "is_verified", "icon": "check-circle" }
  }
}
```

**Estimated:** Фаза 1: 1 година, Фаза 2: 2-3 години

---

### Config Admin Improvements
- [ ] Create more templates - Add templates for common entities (1 day)
- [ ] Improve JsonTreeView - Add more features like edit-in-place (2 days)
- [ ] Add validation UI - Visual validation rules builder (3 days)
- [ ] Export/Import configs - Backup and share configurations (2 days)
- [ ] Refactor icon helper to other apps - Migrate config-admin and landing apps to use centralized `getIconComponent` from UI package (2-3 hours)

### UI Architecture Improvements
**Source:** [UI_ARCHITECTURE_PRINCIPLES.md](./UI_ARCHITECTURE_PRINCIPLES.md)
- [ ] Hot reload for component registry in development
- [ ] Component preview system for config admin
- [ ] Automatic TypeScript types generation from configs
- [ ] Performance monitoring for dynamic components
- [ ] Component versioning system

### After Phase 3
- [ ] Universal search - Search across all entities (3 days)
- [ ] Batch operations UI - Bulk edit interface (2 days)
- [ ] Activity log - Track all config changes (3 days)
- [ ] Performance dashboard - Monitor sync and query performance (2 days)

---

## 📊 ДОВГОСТРОКОВІ ЗАДАЧІ (з LOCAL_FIRST_ROADMAP.md)

### Phase 4: Component Registry & Dynamic UI (2 weeks)
- Universal Form Component
- Universal Table Component
- Universal Card Component
- Dynamic Layout System
- Field Type Registry

### Phase 5: Visual Configuration Builder Enhancement (1 week)
- Drag & Drop form builder
- Visual relationship mapper
- Live preview of configurations
- Import from existing database tables
- Export/Import configurations

### Phase 6: Field Override System (1 week)
- Per-workspace field overrides
- Conditional field visibility
- Custom validation rules
- Dynamic computed fields
- Field permission management

### Phase 7: Configuration Marketplace (2 weeks)
- Public configuration templates
- Industry-specific presets
- Community contributions
- Version management
- Rating and reviews

### Phase 8: Full Migration of apps/app (4 weeks)
- Analysis of existing code (3 days)
- Basic pages migration (1 week)
- Complex features migration (1.5 weeks)
- Testing and bugfixing (3 days)

---

## 💡 NOTES

- Priorities can change based on user needs
- Quick wins can be done in parallel with main phases
- Long-term tasks from LOCAL_FIRST_ROADMAP.md are tracked but not actively planned yet
- Extensions Architecture is the current focus before moving to Phase 3

---

**Related Documentation:**
- [SESSION_RESTART.md](./SESSION_RESTART.md) - Quick restart guide
- [LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md) - Overall project roadmap
- [CHILD_TABLES_IMPLEMENTATION_PLAN.md](./CHILD_TABLES_IMPLEMENTATION_PLAN.md) - Extensions architecture
