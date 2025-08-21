# 📚 BreedHub Documentation Index

> Централізований покажчик всієї документації проекту

## 🏗️ Архітектура та Стратегія

### Основні документи
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Local-First PWA архітектура з NgRx Signal Store
- **[LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md)** - Детальний roadmap впровадження
- **[CLAUDE_INSTRUCTIONS.md](./CLAUDE_INSTRUCTIONS.md)** - Інструкція для AI-моделі Claude
- **[REACT_SIGNAL_STORE_MIGRATION.md](./REACT_SIGNAL_STORE_MIGRATION.md)** - Міграція Signal Store для React
- **[NGRX_SIGNAL_STORE_MIGRATION.md](./NGRX_SIGNAL_STORE_MIGRATION.md)** - ~~NgRx міграція~~ (DEPRECATED - Angular only!)

### Аналітичні документи
- **[MONOREPO_ANALYSIS.md](./MONOREPO_ANALYSIS.md)** - Аналіз та стратегія monorepo
- **[RXDB_VS_YJS_ANALYSIS.md](./RXDB_VS_YJS_ANALYSIS.md)** - Порівняння технологій (історичний)
- **[NGX_ODM_ANALYSIS.md](./NGX_ODM_ANALYSIS.md)** - Аналіз ngx-odm патернів (історичний)

## 👨‍💻 Розробка

### Керівництва розробки
- **[PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md)** - Конвенції та структура проекту
- **[AI_DEVELOPMENT_CHECKLIST.md](./AI_DEVELOPMENT_CHECKLIST.md)** - Чеклист для AI розробки
- **[AI_TESTING_GUIDE.md](./AI_TESTING_GUIDE.md)** - Гайд по тестуванню для AI

### Технічні керівництва
- **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)** - Стратегія тестування
- **[CONFIG_SETUP.md](./CONFIG_SETUP.md)** - Налаштування Windmill + Supabase
- **[SUPABASE_CONNECTION.md](./SUPABASE_CONNECTION.md)** - З'єднання з базою даних

## 📦 Пакети та Компоненти

### Signal Store документація
- **[packages/signal-store/README.md](../packages/signal-store/README.md)** - Signal Store пакет
- **[packages/signal-store/MULTISTORE_ARCHITECTURE.md](../packages/signal-store/MULTISTORE_ARCHITECTURE.md)** - MultiStore архітектура (DEPRECATED)

### UI документація
- **[packages/ui/README.md](../packages/ui/README.md)** - UI бібліотека
- **[apps/signal-store-playground/README.md](../apps/signal-store-playground/README.md)** - Playground для тестування

## 🚀 Застарілі документи (Historical)

Ці документи зберігаються для історії, але не відображають поточну архітектуру:

- **[MULTISTORE_INTEGRATION_PLAN.md](./MULTISTORE_INTEGRATION_PLAN.md)** - План інтеграції MultiStore (замінено на NgRx)
- **[RXDB_VS_YJS_ANALYSIS.md](./RXDB_VS_YJS_ANALYSIS.md)** - Аналіз RxDB vs Yjs (вибрано RxDB)
- **[NGX_ODM_ANALYSIS.md](./NGX_ODM_ANALYSIS.md)** - Аналіз ngx-odm (концепції впроваджені в NgRx)

## 🎯 Швидкий старт

1. **Нові розробники**: Почніть з [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md)
2. **Архітектура**: Вивчіть [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Roadmap**: Ознайомтесь з [LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md)
4. **Міграція**: Слідкуйте за [NGRX_SIGNAL_STORE_MIGRATION.md](./NGRX_SIGNAL_STORE_MIGRATION.md)

## 📊 Статус документації

| Категорія | Статус | Опис |
|-----------|--------|------|
| Архітектура | ✅ Актуально | Оновлено з NgRx Signal Store |
| Roadmap | ✅ Актуально | Phase 2.5 в процесі |
| Міграція | 📅 Планується | React Signal Store optimization |
| Testing | ✅ Актуально | Оновлено для NgRx |
| Config | ✅ Актуально | Supabase + Windmill |
| Historical | 📚 Архів | Зберігається для історії |

## 🔄 Останні оновлення

- **2024**: Оптимізація React Signal Store з @preact/signals-react
- **2024**: Config-driven архітектура з Supabase
- **2024**: Реорганізація документації в docs/
- **2024**: Оновлення всіх посилань в README.md

## 📝 Правила документації

1. **Актуальність**: Оновлюйте документацію одразу після змін
2. **Зв'язки**: Використовуйте відносні посилання між документами
3. **Статус**: Позначайте застарілі документи як DEPRECATED
4. **Історія**: Зберігайте історичні документи для контексту
5. **Структура**: Тримайте всі .md файли в docs/ папці
