# TODO: Loading UI & Skeletons

**Created:** 2025-12-01
**Status:** In Progress

---

## Problem

При загрузці та навігації відбувається блимання - пустий екран або "Loading..." замість плавного UX.
В старому Angular проекті було краще: loading bar зверху + скелетони в компонентах.

---

## План реалізації

### Фаза 1: Loading Bar (глобальний індикатор)

**Що робимо:**
- [ ] Створити `LoadingBar` компонент - тонка смужка зверху екрану (fixed, z-999)
- [ ] Використати signal з `spaceStore.isSyncing` або створити окремий `loadingStore`
- [ ] Додати в `App.tsx` або `Layout` - рендериться завжди, показується коли є активні запити

**Файли:**
- `apps/app/src/components/shared/LoadingBar.tsx` - новий компонент
- `apps/app/src/App.tsx` - додати LoadingBar

**Референс (Angular):**
- `/Users/annaglova/projects/org/libs/schema/ui/loading-bar-ui/loading-bar.component.ts`
- `/Users/annaglova/projects/org/libs/schema/ui/loading-bar-ui/loading/loading.service.ts`

---

### Фаза 2: Скелетони для Space (список entities)

**Що робимо:**
- [ ] `SpaceView` показує скелетони замість пустого списку коли `isLoading && entities.length === 0`
- [ ] Скелетон для list view: аватар (круг) + 2 лінії тексту
- [ ] Скелетон для grid view: картка-placeholder

**Файли:**
- `apps/app/src/components/space/SpaceView.tsx` - додати skeleton mode
- `apps/app/src/components/space/ListCardSkeleton.tsx` - новий компонент
- `apps/app/src/components/space/GridCardSkeleton.tsx` - новий компонент

**Референс (Angular):**
- `/Users/annaglova/projects/org/libs/schema/feature/collection-view-scroller/list/entity-list-card.component.ts`

---

### Фаза 3: Скелетони для Drawer (публічна сторінка entity)

**Що робимо:**
- [ ] `NameOutlet` - перевірити/оновити існуючий skeleton
- [ ] `AvatarOutlet` - додати skeleton (круг + кнопки)
- [ ] `CoverOutlet` - skeleton для cover image
- [ ] Tabs - skeleton для контенту табів

**Файли:**
- `apps/app/src/components/template/NameOutlet.tsx`
- `apps/app/src/components/template/AvatarOutlet.tsx`
- `apps/app/src/components/template/CoverOutlet.tsx`

**Референс (Angular):**
- `/Users/annaglova/projects/org/libs/schema/ui/template/name/name-container-outlet.component.ts`
- `/Users/annaglova/projects/org/libs/schema/ui/template/avatar/avatar-outlet.component.ts`

---

### Фаза 4: Навігація без блимання

**Після того як скелетони готові:**
- [ ] Тестувати Back/Forward navigation
- [ ] Видалити хаки якщо є (skipNextLoading тощо)
- [ ] Navigation має показувати скелетони замість пустоти

---

## Порядок виконання

1. **LoadingBar** - швидко, дає візуальний feedback одразу
2. **SpaceView skeletons** - найбільш помітне покращення
3. **Drawer skeletons** - для повноти UX
4. **Тестування навігації** - має працювати без додаткових фіксів

---

## Notes

- Layout (header, sidebar, структура) рендериться ВІДРАЗУ
- Контент всередині показує скелетони
- Progress bar зверху показує загальний прогрес
- Ніяких блокуючих "Loading..." на весь екран
