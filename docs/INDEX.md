# 📚 BreedHub Documentation Index

> Централізований покажчик всієї документації проекту

## 🏗️ Архітектура та Стратегія

### Core Architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Overall system architecture and design principles
- **[STORE_ARCHITECTURE.md](./STORE_ARCHITECTURE.md)** - Store layer architecture (AppStore, ConfigStore, SpaceStore)
- **[SPACE_STORE_ARCHITECTURE.md](./SPACE_STORE_ARCHITECTURE.md)** - Universal dynamic store for ALL business entities ✨
- **[PROPERTY_BASED_CONFIG_ARCHITECTURE.md](./PROPERTY_BASED_CONFIG_ARCHITECTURE.md)** - Configuration system foundation (properties, fields, spaces)
- **[LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md)** - Local-first architecture implementation roadmap

### Implementation Guides
- **[STORE_CREATION_GUIDE.md](./STORE_CREATION_GUIDE.md)** - Step-by-step guide for creating stores
- **[ENTITY_STORE_IMPLEMENTATION_PLAN.md](./ENTITY_STORE_IMPLEMENTATION_PLAN.md)** - Plan for implementing Entity Store pattern
- **[ANGULAR_PATTERNS_TO_ADOPT.md](./ANGULAR_PATTERNS_TO_ADOPT.md)** - Useful patterns from Angular NgRx to adopt 🆕
- **[RXDB_IMPLEMENTATION_GUIDE.md](./RXDB_IMPLEMENTATION_GUIDE.md)** - RxDB setup and usage guide

### Аналітичні документи
- **[MONOREPO_ANALYSIS.md](./MONOREPO_ANALYSIS.md)** - Аналіз та стратегія monorepo

## 👨‍💻 Розробка

### Керівництва розробки
- **[PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md)** - Coding standards and best practices
- **[AI_DEVELOPMENT_CHECKLIST.md](./AI_DEVELOPMENT_CHECKLIST.md)** - Checklist for AI-assisted development
- **[CLAUDE_INSTRUCTIONS.md](./CLAUDE_INSTRUCTIONS.md)** - Instructions for working with Claude

### Product & Strategy
- **[PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md)** - Product vision and strategy

### Testing
- **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)** - Project testing strategy (Unit, Integration, E2E)
- **[AI_TESTING_CHECKLIST.md](./AI_TESTING_CHECKLIST.md)** - Checklist for AI/Claude when writing and testing code

### Technical Details
- **[SUPABASE_CONNECTION.md](./SUPABASE_CONNECTION.md)** - Supabase integration notes

## 🎯 Key Concepts

### Store Hierarchy
```
AppStore (Global app state)
    ↓
ConfigStore (All configurations)
    ↓
SpaceStore (ALL business entities - ONE universal store)
```

### Current Tech Stack
- **Frontend**: React/TypeScript with Vite
- **State Management**: @preact/signals-react + Custom Entity Store
- **Local Database**: RxDB with IndexedDB
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS

### Development Philosophy
- **Local-First**: Data lives on device, syncs when online
- **Configuration-Driven**: UI and behavior driven by configs
- **Universal Store**: ONE store for all business entities
- **6-Day Sprints**: Rapid development cycles

## 📚 Архівні документи

Історичні та застарілі документи переміщені до папки `archive/` для збереження історії проекту:

### Recently Archived (2024-09-26)
- **[archive/REACT_SIGNAL_STORE_MIGRATION.md](./archive/REACT_SIGNAL_STORE_MIGRATION.md)** - Already using @preact/signals-react
- **[archive/UNIVERSAL_STORE_IMPLEMENTATION.md](./archive/UNIVERSAL_STORE_IMPLEMENTATION.md)** - Replaced by SPACE_STORE_ARCHITECTURE.md
- **[archive/PROPERTY_CATEGORIZATION_PLAN.md](./archive/PROPERTY_CATEGORIZATION_PLAN.md)** - Old field categorization concept

### Previously Archived
- **[archive/CONFIG_ARCHITECTURE.md](./archive/CONFIG_ARCHITECTURE.md)** - Old config architecture
- **[archive/CONFIG_DRIVEN_STORE.md](./archive/CONFIG_DRIVEN_STORE.md)** - Old config-driven approach
- **[archive/NGRX_SIGNAL_STORE_MIGRATION.md](./archive/NGRX_SIGNAL_STORE_MIGRATION.md)** - NgRx migration (Angular only!)
- **[archive/MULTISTORE_ARCHITECTURE.md](./archive/MULTISTORE_ARCHITECTURE.md)** - MultiStore architecture
- **[archive/RXDB_VS_YJS_ANALYSIS.md](./archive/RXDB_VS_YJS_ANALYSIS.md)** - RxDB vs Yjs analysis
- **[archive/NGX_ODM_ANALYSIS.md](./archive/NGX_ODM_ANALYSIS.md)** - ngx-odm pattern analysis

## 🎯 Quick Start

1. **New Developers**: Start with [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md)
2. **Architecture**: Study [ARCHITECTURE.md](./ARCHITECTURE.md) and [STORE_ARCHITECTURE.md](./STORE_ARCHITECTURE.md)
3. **Implementation**: Follow [STORE_CREATION_GUIDE.md](./STORE_CREATION_GUIDE.md)
4. **Space Store**: Understand [SPACE_STORE_ARCHITECTURE.md](./SPACE_STORE_ARCHITECTURE.md)

## 📊 Documentation Status

| Category | Status | Description |
|----------|--------|-------------|
| Architecture | ✅ Current | Entity Store pattern with SpaceStore |
| Store Docs | ✅ Current | Updated with selection patterns |
| Implementation | ✅ Current | Angular patterns adopted |
| Testing | ✅ Current | Comprehensive testing strategy |
| Product | ✅ Current | Clear product strategy |
| Archive | 📚 Historical | Preserved for context |

## 🔄 Recent Updates

- **2024-09-26**: Major documentation cleanup and reorganization
  - Archived 4 outdated documents
  - Added Angular patterns documentation
  - Updated Space Store with selection patterns
  - Refreshed INDEX.md structure
- **2024-09-25**: Entity Store implementation with NgRx-like API
- **2024-09-23**: Product strategy document created
- **2024-09**: Space Store architecture established

## 📝 Documentation Rules

1. **Currency**: Update documentation immediately after changes
2. **Links**: Use relative links between documents
3. **Status**: Mark outdated documents as DEPRECATED and move to archive
4. **History**: Preserve historical documents for context
5. **Structure**: Keep all active .md files in docs/ folder
6. **Language**: Use English for technical documentation
7. **Clarity**: Be concise and specific
