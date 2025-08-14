# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2024-08-14

### Added
- Initial release of React SignalStore
- Core features:
  - Entity management with CRUD operations
  - Selection (single and multiple)
  - Filtering and search with debouncing
  - Sorting capabilities
  - Request status management
  - Optimistic updates with rollback
  - Retry logic with exponential backoff
- Super Store hierarchical architecture
- IndexedDB synchronization support
- Fractal composition patterns
- TypeScript support with full type safety
- Example implementation with Breed entity

### Architecture
- Inspired by NgRx SignalStore
- Built on top of Zustand and Immer
- Modular feature composition
- Self-similar (fractal) patterns for scalability