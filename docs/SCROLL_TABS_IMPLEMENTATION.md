# Scroll-Based Tabs Implementation Plan

**Дата:** 2025-11-03
**Статус:** 🟡 Planning
**Автор:** Implementation Plan

---

## 📋 Executive Summary

**Задача:** Створити scroll-based tabs систему для Public Pages з auto URL sync та IntersectionObserver tracking.

**Ключова відмінність:** На відміну від стандартних Radix Tabs, наші таби працюють через scroll секції з автоматичною синхронізацією URL hash та видимістю контенту.

**Reference:** Angular implementation в `/Users/annaglova/projects/org`

---

## ❌ Чому НЕ використовуємо існуючі Radix Tabs?

### Проблема 1: State Management
**Radix Tabs:**
```tsx
// Працює через controlled state
<Tabs value="achievements" onValueChange={setValue}>
  <TabsContent value="achievements">...</TabsContent>
  <TabsContent value="patrons">...</TabsContent>
</Tabs>
```
- Рендерить тільки **активний** TabsContent
- Інші таби **unmounted**
- Switching = mount/unmount cycle

**Наша задача:**
- ✅ Всі таби завжди в DOM
- ✅ Scroll між секціями (не switching)
- ✅ IntersectionObserver tracking visibility
- ✅ Auto URL hash update при scroll

### Проблема 2: Scroll Behavior
**Radix Tabs:**
- Click на tab trigger → показує інший content
- Немає scroll між секціями
- Немає scroll position tracking

**Наша задача:**
- ✅ Всі таби = scroll sections на одній сторінці
- ✅ Scroll to tab при зміні URL hash
- ✅ Auto-update hash при scroll до табу
- ✅ Smooth scroll transitions

### Проблема 3: URL Integration
**Radix Tabs:**
- Не підтримує URL hash sync out of box
- Треба manually синхронізувати state з URL

**Наша задача:**
- ✅ URL hash = source of truth
- ✅ `/breeds/german-shepherd#patrons` → scroll до Patrons tab
- ✅ Scroll до Achievements → URL = `#achievements`

### Висновок:

| Критерій | Radix Tabs | Scroll Tabs (наша задача) |
|----------|-----------|---------------------------|
| **Рендеринг** | Один активний tab | Всі таби в DOM |
| **Navigation** | Click → switch | Scroll між секціями |
| **URL** | Manual sync | Auto hash sync |
| **Visibility** | Boolean (active/not) | Percentage (0-100%) |
| **Use case** | Компактний UI з табами | Long-form content зі scroll |

**Рішення:** Створюємо власні scroll-based tabs компоненти.

---

## 🔗 Angular Reference Links

### Core Components:
- **TabHeader:** `/Users/annaglova/projects/org/libs/schema/ui/template/tab-header.component.ts`
- **TabStore:** `/Users/annaglova/projects/org/libs/schema/store/page-tab-store/tab.storeV2.service.ts`
- **TabStore State:** `/Users/annaglova/projects/org/libs/schema/store/page-tab-store/tab-store-state-va2.ts`
- **ScrollableTab Directive:** `/Users/annaglova/projects/org/libs/schema/ui/scrollable-tab-ui/scrollable-tab.directive.ts`
- **Page Tabs Feature:** `/Users/annaglova/projects/org/libs/schema/store/page-tab-store/tabs/page-tabs.feature.ts`
- **Page Tabs Visibility:** `/Users/annaglova/projects/org/libs/schema/store/page-tab-store/tabs/page-tabs-visibility.feature.ts`

### Breed Page Implementation:
- **Routing:** `/Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/breed.routing.ts`
- **BreedSupportLevels:** `/Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/components/breed-support-levels/breed-support-levels.component.ts`
- **BreedPatrons:** `/Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/components/breed-patrons/breed-patrons.component.ts`
- **BreedTopPets:** `/Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/components/breed-top-pets/breed-top-pets.component.ts`
- **BreedTopKennels:** `/Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/components/breed-top-kennels/breed-top-kennels.component.ts`
- **BreedMoments:** `/Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/components/breed-moments/breed-moments.component.ts`

---

## 📊 Angular Tab System Analysis

### Tab Structure (з Angular):
```typescript
export type Tab = {
  fragment: string;      // URL hash: 'achievements', 'patrons'
  label: string;         // Display name: 'Breed achievements'
  icon: string;          // PrimeNG icon: 'pi pi-check-circle'
  tabIndex: number;      // Order: 0, 1, 2...
  id: string;            // Unique ID
  url: string;           // Fullscreen URL (optional)
  top: number;           // Scroll position
  hiddenFn: () => Signal<boolean>; // Visibility function
};
```

### Tab Store Механіка:

**1. Visibility Tracking:**
```typescript
// ScrollableTabDirective на кожному табі
observeBodyVisibility(resize$) {
  // IntersectionObserver → bodyVisibility (0-1)
}

// TabStore computed
firstViewportTab = computed(() =>
  entities.find(tab => tab.bodyVisibility() > 0.02)
);
```

**2. Auto URL Sync:**
```typescript
// Коли змінюється найбільш видимий таб
if (currentFragment !== urlFragment) {
  navStore.changeFragment(firstViewportTab.fragment);
}
```

**3. Auto Scroll:**
```typescript
// Коли змінюється URL hash
const to = selectedTab.initTop() - scrollDelta + 15;
scrollTo(to, { behavior: 'smooth' });
```

### Tab Header Modes:

**Mode: "list"** (в контенті сторінки)
```tsx
<div className="mb-5 flex w-full items-center text-2xl font-semibold">
  <Icon />
  <span>Breed achievements</span>
  <button>window-maximize icon</button> // Fullscreen
</div>
```

**Mode: "compact"** (мала кнопка справа)
```tsx
<div className="ml-auto flex items-center">
  <span>Full screen view</span>
  <button>window-maximize</button>
</div>
```

**Coming Soon Label:**
```tsx
{tab.fragment === 'moments' && (
  <div className="text-sm font-bold uppercase text-primary ml-auto">
    Coming soon
  </div>
)}
```

---

## 🎯 Implementation Plan

### Phase 1: Базова структура (2-3 дні) ⬅️ START HERE

**Мета:** Створити scroll-based tabs без auto-scroll механізму

#### 1.1 Create `TabHeader.tsx`
**Location:** `/apps/app/src/components/tabs/TabHeader.tsx`

```typescript
interface TabHeaderProps {
  label: string;
  icon: React.ReactNode;
  mode?: "list" | "compact"; // list = у контенті, compact = fullscreen button
  comingSoon?: boolean;
  fullscreenUrl?: string; // URL для fullscreen mode
  className?: string;
}

/**
 * TabHeader - Header для scroll-based tab
 *
 * Reference: /Users/annaglova/projects/org/libs/schema/ui/template/tab-header.component.ts
 *
 * Features:
 * - Two modes: list (large header in content) | compact (small button)
 * - Optional "Coming soon" label
 * - Optional fullscreen button
 */
```

**Visual:**
- **List mode:** Великий header (text-2xl) з іконкою, full width
- **Compact mode:** Справа align, мала кнопка з window-maximize icon
- **Coming soon:** Primary text справа

**CSS classes (from Angular):**
```tsx
// List mode
className="mb-5 flex w-full items-center text-2xl font-semibold text-sub-header-color bg-header-ground/75 backdrop-blur-sm"

// First tab has mt-5, others mt-10
{isFirst ? 'mt-5' : 'mt-10'}

// Icon + Label
<Icon size={20} className="mr-2" />
<span>{label}</span>

// Coming soon
{comingSoon && (
  <div className="text-center text-sm font-bold uppercase text-primary ml-auto">
    Coming soon
  </div>
)}

// Fullscreen button
{fullscreenUrl && (
  <a href={fullscreenUrl} className="ml-auto">
    <Maximize2 size={16} className="text-sub-header-color" />
  </a>
)}
```

#### 1.2 Create `ScrollableTab.tsx`
**Location:** `/apps/app/src/components/tabs/ScrollableTab.tsx`

```typescript
interface ScrollableTabProps {
  id: string; // Tab ID = URL fragment
  children: React.ReactNode;
  onVisibilityChange?: (id: string, visibility: number) => void;
  className?: string;
}

/**
 * ScrollableTab - Wrapper для tab content з visibility tracking
 *
 * Reference: /Users/annaglova/projects/org/libs/schema/ui/scrollable-tab-ui/scrollable-tab.directive.ts
 *
 * Features:
 * - IntersectionObserver для tracking visibility
 * - Викликає onVisibilityChange(id, 0.0-1.0)
 * - ID для scroll targeting
 */
```

**Implementation:**
```tsx
export function ScrollableTab({ id, children, onVisibilityChange, className }: ScrollableTabProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !onVisibilityChange) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // intersectionRatio = 0.0 (not visible) to 1.0 (fully visible)
        onVisibilityChange(id, entry.intersectionRatio);
      },
      {
        threshold: Array.from({ length: 101 }, (_, i) => i / 100), // 0.00, 0.01, ... 1.00
        rootMargin: '0px',
      }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [id, onVisibilityChange]);

  return (
    <div ref={ref} id={`tab-${id}`} className={className}>
      {children}
    </div>
  );
}
```

#### 1.3 Create `TabsContainer.tsx`
**Location:** `/apps/app/src/components/tabs/TabsContainer.tsx`

```typescript
interface Tab {
  id: string;           // Unique ID
  fragment: string;     // URL hash: 'achievements'
  label: string;        // 'Breed achievements'
  icon: React.ReactNode; // Lucide icon component
  comingSoon?: boolean; // Show "Coming soon" label
  fullscreenUrl?: string; // Optional fullscreen URL
  component: React.ComponentType<any>; // Tab content component
}

interface TabsContainerProps {
  tabs: Tab[];
  className?: string;
}

/**
 * TabsContainer - Container для всіх scroll-based tabs
 *
 * Reference: /Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/breed.routing.ts
 *
 * Features:
 * - Рендерить всі таби як scroll sections
 * - TabHeader + ScrollableTab для кожного табу
 * - Visibility tracking для всіх табів
 */
```

**Structure:**
```tsx
export function TabsContainer({ tabs, className }: TabsContainerProps) {
  const [visibilityMap, setVisibilityMap] = useState<Record<string, number>>({});

  const handleVisibilityChange = (id: string, visibility: number) => {
    setVisibilityMap(prev => ({ ...prev, [id]: visibility }));
  };

  return (
    <div className={className}>
      {tabs.map((tab, index) => {
        const Component = tab.component;

        return (
          <ScrollableTab
            key={tab.id}
            id={tab.fragment}
            onVisibilityChange={handleVisibilityChange}
          >
            <TabHeader
              label={tab.label}
              icon={tab.icon}
              mode="list"
              comingSoon={tab.comingSoon}
              fullscreenUrl={tab.fullscreenUrl}
              className={index === 0 ? 'mt-5' : 'mt-10'}
            />
            <Component />
          </ScrollableTab>
        );
      })}
    </div>
  );
}
```

#### 1.4 Create Mock Tab Component
**Location:** `/apps/app/src/components/breed/tabs/BreedAchievementsTab.tsx`

```typescript
/**
 * BreedAchievementsTab - Achievements timeline tab
 *
 * Reference: /Users/annaglova/projects/org/.../breed-support-levels.component.ts
 *
 * TODO: Implement timeline with mock data
 * For now - simple placeholder
 */
export function BreedAchievementsTab() {
  return (
    <div className="mt-3">
      <p className="text-muted-foreground">Achievements timeline coming soon...</p>
    </div>
  );
}
```

#### 1.5 Integrate в PublicPageTemplate

```tsx
// Add to PublicPageTemplate.tsx after BreedAchievements

const mockTabs = [
  {
    id: 'achievements',
    fragment: 'achievements',
    label: 'Breed achievements',
    icon: <CheckCircle size={20} />,
    component: BreedAchievementsTab,
  },
  {
    id: 'patrons',
    fragment: 'patrons',
    label: 'Patrons',
    icon: <Heart size={20} />,
    component: () => <div className="mt-3">Patrons tab coming soon...</div>,
  },
  {
    id: 'moments',
    fragment: 'moments',
    label: 'Moments',
    icon: <Image size={20} />,
    comingSoon: true,
    component: () => <div className="mt-3">Moments gallery coming soon...</div>,
  },
];

// After BreedAchievements
<TabsContainer tabs={mockTabs} />
```

**Deliverables Phase 1:**
- ✅ TabHeader component (2 modes)
- ✅ ScrollableTab component (IntersectionObserver)
- ✅ TabsContainer (renders all tabs)
- ✅ Mock BreedAchievementsTab
- ✅ Integrated в PublicPageTemplate
- ✅ Візуально працює scroll між табами

---

### Phase 2: URL Fragment Sync (1 день)

**Мета:** Синхронізувати URL hash з найбільш видимим табом

#### 2.1 Create `useTabScroll` hook
**Location:** `/apps/app/src/hooks/useTabScroll.ts`

```typescript
/**
 * useTabScroll - Hook для scroll-based tabs з URL sync
 *
 * Reference: /Users/annaglova/projects/org/.../tab.storeV2.service.ts
 *
 * Features:
 * - Трекає visibility всіх табів
 * - Auto-update URL hash при scroll
 * - Returns activeTab ID
 */
interface UseTabScrollOptions {
  tabs: Tab[];
  threshold?: number; // Min visibility to consider "active" (default 0.02)
}

function useTabScroll({ tabs, threshold = 0.02 }: UseTabScrollOptions) {
  const [visibilityMap, setVisibilityMap] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.fragment || '');

  // Find most visible tab (> threshold)
  const mostVisibleTab = useMemo(() => {
    const visible = Object.entries(visibilityMap)
      .filter(([_, visibility]) => visibility > threshold)
      .sort(([, a], [, b]) => b - a);

    return visible[0]?.[0]; // Return ID of most visible
  }, [visibilityMap, threshold]);

  // Auto-update URL hash when most visible changes
  useEffect(() => {
    if (mostVisibleTab && mostVisibleTab !== activeTab) {
      window.location.hash = mostVisibleTab;
      setActiveTab(mostVisibleTab);
    }
  }, [mostVisibleTab, activeTab]);

  return {
    activeTab,
    visibilityMap,
    setVisibility: (id: string, visibility: number) => {
      setVisibilityMap(prev => ({ ...prev, [id]: visibility }));
    },
  };
}
```

#### 2.2 Integrate в TabsContainer

```tsx
export function TabsContainer({ tabs }: TabsContainerProps) {
  const { activeTab, setVisibility } = useTabScroll({ tabs });

  return (
    <div>
      {tabs.map(tab => (
        <ScrollableTab
          key={tab.id}
          id={tab.fragment}
          onVisibilityChange={setVisibility}
        >
          {/* ... */}
        </ScrollableTab>
      ))}
    </div>
  );
}
```

**Deliverables Phase 2:**
- ✅ useTabScroll hook
- ✅ Auto URL hash update при scroll
- ✅ activeTab tracking

---

### Phase 3: Auto-scroll механізм (1-2 дні)

**Мета:** Scroll до табу при зміні URL hash

#### 3.1 Add scroll method to useTabScroll

```typescript
function useTabScroll({ tabs, threshold = 0.02 }: UseTabScrollOptions) {
  // ... existing code

  // Scroll to tab when hash changes (manually or from URL)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (hash && hash !== activeTab) {
        const element = document.getElementById(`tab-${hash}`);
        if (element) {
          // Calculate scroll position (like Angular)
          const scrollDelta = 80; // Account for sticky header
          const top = element.offsetTop - scrollDelta;

          window.scrollTo({
            top,
            behavior: 'smooth',
          });

          setActiveTab(hash);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    // Initial scroll on mount
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  return { activeTab, visibilityMap, setVisibility };
}
```

#### 3.2 Add "ready to scroll" flag

```typescript
// Like Angular TabStoreV2 readyToScroll flag
const [readyToScroll, setReadyToScroll] = useState(false);

useEffect(() => {
  // Enable scroll after initial render
  const timer = setTimeout(() => setReadyToScroll(true), 500);
  return () => clearTimeout(timer);
}, []);

// Only scroll if ready
if (readyToScroll && hash !== activeTab) {
  scrollToTab(hash);
}
```

**Deliverables Phase 3:**
- ✅ Auto-scroll на hash change
- ✅ Smooth scroll з offset для sticky header
- ✅ "Ready to scroll" flag (prevent scroll on mount)

---

### Phase 4: Tab Content Components (3-5 днів)

**Мета:** Створити реальний контент для кожного табу

#### 4.1 BreedAchievementsTab (Timeline)
**Location:** `/apps/app/src/components/breed/tabs/BreedAchievementsTab.tsx`

**Reference:** `/Users/annaglova/projects/org/.../breed-support-levels.component.ts`

**UI:** Timeline component (може використати Timeline з `/packages/ui/components/timeline.tsx` якщо є)

**Mock data:**
```typescript
const mockAchievements = [
  {
    id: '1',
    name: 'Golden Achievement',
    intValue: 5000,
    date: '2024-06-15',
    description: 'Reached 5000 supporters milestone',
    active: true,
  },
  {
    id: '2',
    name: 'Silver Achievement',
    intValue: 1000,
    date: '2023-03-20',
    description: 'First 1000 supporters',
    active: true,
  },
  {
    id: '3',
    name: 'Platinum Achievement',
    intValue: 10000,
    description: 'Reach 10000 supporters',
    active: false, // Not achieved yet
  },
];
```

#### 4.2 BreedPatronsTab
**Location:** `/apps/app/src/components/breed/tabs/BreedPatronsTab.tsx`

**Reference:** `/Users/annaglova/projects/org/.../breed-patrons.component.ts`

**UI:** Grid/List патронів з avatars

#### 4.3 BreedTopPetsTab
**Location:** `/apps/app/src/components/breed/tabs/BreedTopPetsTab.tsx`

**Reference:** `/Users/annaglova/projects/org/.../breed-top-pets.component.ts`

**UI:** Grid топ петів

#### 4.4 BreedTopKennelsTab
**Location:** `/apps/app/src/components/breed/tabs/BreedTopKennelsTab.tsx`

**Reference:** `/Users/annaglova/projects/org/.../breed-top-kennels.component.ts`

**UI:** Grid топ розплідників

#### 4.5 BreedMomentsTab
**Location:** `/apps/app/src/components/breed/tabs/BreedMomentsTab.tsx`

**Reference:** `/Users/annaglova/projects/org/.../breed-moments.component.ts`

**UI:** Photo gallery (може бути "Coming soon" placeholder)

**Deliverables Phase 4:**
- ✅ 5 tab components з mock data
- ✅ Реальний UI (не placeholder)
- ✅ Використання UI components з `/packages/ui`

---

### Phase 5: Sticky Tabs Navigation (опціонально, 1 день)

**Мета:** Sticky tabs bar вгорі при скролі (як breadcrumbs)

**Component:** `StickyTabsBar.tsx`

```tsx
interface StickyTabsBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabClick: (fragment: string) => void;
}

/**
 * StickyTabsBar - Sticky navigation bar з табами
 *
 * Shows when user scrolls past BreedName
 * Allows quick navigation between tabs
 */
```

**Visual:**
- Sticky top з backdrop-blur
- Horizontal scroll якщо багато табів
- Active tab highlighted
- Click → smooth scroll до табу

**Deliverables Phase 5:**
- ✅ StickyTabsBar component
- ✅ Show/hide на scroll
- ✅ Click → scroll до табу

---

## 📊 Timeline Summary

| Phase | Назва | Компоненти | Час | Пріоритет |
|-------|-------|------------|-----|-----------|
| **1** | Базова структура | TabHeader, ScrollableTab, TabsContainer, Mock tab | 2-3 дні | **HIGH** ⬅️ |
| **2** | URL Fragment Sync | useTabScroll hook, auto hash update | 1 день | **HIGH** |
| **3** | Auto-scroll | Scroll to tab, smooth behavior | 1-2 дні | **MEDIUM** |
| **4** | Tab Content | 5 tab components з mock data | 3-5 днів | **HIGH** |
| **5** | Sticky Navigation | StickyTabsBar (optional) | 1 день | **LOW** |

**Total:** 7-12 днів

---

## ✅ Success Criteria

**Phase 1:**
- ✅ Всі таби рендеряться як scroll sections
- ✅ TabHeader показує назву + іконку
- ✅ "Coming soon" label працює
- ✅ IntersectionObserver трекає visibility
- ✅ Console.log показує visibility changes

**Phase 2:**
- ✅ URL hash auto-updates при scroll
- ✅ `/breeds/german-shepherd#patrons` показує patrons section
- ✅ Scroll patrons → URL змінюється на `#patrons`

**Phase 3:**
- ✅ Клік на fullscreen button → scroll до табу
- ✅ Manual URL change → smooth scroll
- ✅ Scroll offset враховує sticky header

**Phase 4:**
- ✅ Всі 5 табів мають реальний контент
- ✅ Mock data показується коректно
- ✅ UI виглядає як в Angular проекті

**Phase 5:**
- ✅ Sticky bar показується при scroll
- ✅ Click на tab → scroll працює
- ✅ Active tab highlighted

---

## 🔗 Related Documents

- [SESSION_RESTART.md](./SESSION_RESTART.md) - Поточний стан проекту
- [PUBLIC_PAGE_IMPLEMENTATION_PLAN.md](./PUBLIC_PAGE_IMPLEMENTATION_PLAN.md) - Public page architecture
- [PROPERTY_BASED_CONFIG_ARCHITECTURE.md](./PROPERTY_BASED_CONFIG_ARCHITECTURE.md) - Config system (майбутнє)

---

## 📝 Notes

**Angular Tab Store НЕ потрібен:**
- В Angular: NgRx SignalStore з computed values
- В React: Простий useState + useEffect
- SpaceStore збере page data пізніше

**Hardcoded перший, Config потім:**
- Спочатку hardcode tabs в PublicPageTemplate
- Потім витягнемо з app_config (Phase 3 з PUBLIC_PAGE_IMPLEMENTATION_PLAN.md)

**Timeline component:**
- Перевір чи є в `/packages/ui/components/timeline.tsx`
- Якщо немає - створимо простий для BreedAchievementsTab

---

**Status:** ✅ Plan Ready
**Next Step:** Start Phase 1 - Create TabHeader component
