# 📚 BreedHub Documentation Index

> Централізований покажчик всієї документації проекту

## 🏗️ Архітектура та Стратегія

### Основні документи
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Local-First PWA архітектура з NgRx Signal Store
- **[LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md)** - Детальний roadmap впровадження
- **[CLAUDE_INSTRUCTIONS.md](./CLAUDE_INSTRUCTIONS.md)** - Інструкція для AI-моделі Claude
- **[REACT_SIGNAL_STORE_MIGRATION.md](./REACT_SIGNAL_STORE_MIGRATION.md)** - Міграція Signal Store для React

### Аналітичні документи
- **[MONOREPO_ANALYSIS.md](./MONOREPO_ANALYSIS.md)** - Аналіз та стратегія monorepo

## 👨‍💻 Розробка

### Керівництва розробки
- **[PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md)** - Конвенції та структура проекту
- **[AI_DEVELOPMENT_CHECKLIST.md](./AI_DEVELOPMENT_CHECKLIST.md)** - Чеклист для AI розробки
- **[AI_TESTING_GUIDE.md](./AI_TESTING_GUIDE.md)** - Гайд по тестуванню для AI

### Configuration Management 🆕
- **[PROPERTY_BASED_CONFIG_ARCHITECTURE.md](./PROPERTY_BASED_CONFIG_ARCHITECTURE.md)** - Нова property-based архітектура конфігурацій
- **[CONFIG_TS.md](./CONFIG_TS.md)** - Вимоги та завдання для config-admin

### Технічні керівництва
- **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)** - Стратегія тестування
- **[RXDB_IMPLEMENTATION_GUIDE.md](./RXDB_IMPLEMENTATION_GUIDE.md)** - RxDB best practices
- **[SUPABASE_CONNECTION.md](./SUPABASE_CONNECTION.md)** - З'єднання з базою даних

## 📦 Пакети та Компоненти

### Signal Store документація
- **[packages/signal-store/README.md](../packages/signal-store/README.md)** - Signal Store пакет

### UI документація
- **[packages/ui/README.md](../packages/ui/README.md)** - UI бібліотека
- **[apps/signal-store-playground/README.md](../apps/signal-store-playground/README.md)** - Playground для тестування

## 📚 Архівні документи

Історичні та застарілі документи переміщені до папки `archive/` для збереження історії проекту:

### Попередні системи конфігурації
- **[archive/CONFIG_ARCHITECTURE.md](./archive/CONFIG_ARCHITECTURE.md)** - Попередня архітектура конфігурацій з app_config
- **[archive/CONFIG_DRIVEN_STORE.md](./archive/CONFIG_DRIVEN_STORE.md)** - Попередній config-driven підхід
- **[archive/CONFIG_SETUP.md](./archive/CONFIG_SETUP.md)** - Попередня інтеграція з Windmill

### MultiStore та міграції
- **[archive/NGRX_SIGNAL_STORE_MIGRATION.md](./archive/NGRX_SIGNAL_STORE_MIGRATION.md)** - NgRx міграція (DEPRECATED - Angular only!)
- **[archive/MULTISTORE_INTEGRATION_PLAN.md](./archive/MULTISTORE_INTEGRATION_PLAN.md)** - План інтеграції MultiStore
- **[archive/MULTISTORE_ARCHITECTURE.md](./archive/MULTISTORE_ARCHITECTURE.md)** - MultiStore архітектура

### Аналізи та дослідження
- **[archive/RXDB_VS_YJS_ANALYSIS.md](./archive/RXDB_VS_YJS_ANALYSIS.md)** - Аналіз RxDB vs Yjs
- **[archive/NGX_ODM_ANALYSIS.md](./archive/NGX_ODM_ANALYSIS.md)** - Аналіз ngx-odm патернів

## 🎯 Швидкий старт

1. **Нові розробники**: Почніть з [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md)
2. **Архітектура**: Вивчіть [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Roadmap**: Ознайомтесь з [LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md)
4. **Міграція**: Слідкуйте за [REACT_SIGNAL_STORE_MIGRATION.md](./REACT_SIGNAL_STORE_MIGRATION.md)

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

- **2024-12**: Створення архівної папки для історичних документів
- **2024**: Додано Phase 6: Visual Config Admin в roadmap
- **2024**: Оптимізація React Signal Store з @preact/signals-react
- **2024**: Config-driven архітектура з Supabase
- **2024**: Реорганізація документації в docs/

## 📝 Правила документації

1. **Актуальність**: Оновлюйте документацію одразу після змін
2. **Зв'язки**: Використовуйте відносні посилання між документами
3. **Статус**: Позначайте застарілі документи як DEPRECATED
4. **Історія**: Зберігайте історичні документи для контексту
5. **Структура**: Тримайте всі .md файли в docs/ папці
