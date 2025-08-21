# 🚀 NgRx Signal Store Migration Plan

> Комплексний план міграції з MultiStore на NgRx Signal Store з config-driven архітектурою

## 📊 Executive Summary

### Що міняємо:
- **MultiStore** → **NgRx Signal Store**
- **Hardcoded entities** → **Config-driven з Supabase**
- **Custom signals** → **NgRx signals patterns**
- **Manual sync** → **Auto-sync з real-time**

### Ключові переваги:
1. **Industry standard** - NgRx широко використовується
2. **Better DX** - кращі DevTools та документація
3. **Type safety** - автоматична типізація
4. **Performance** - оптимізовані updates
5. **Extensibility** - custom features через signalStoreFeature

## 🏗️ Архітектура

### Current (MultiStore):
```
MultiStore → Entities Map → UI Components
    ↓            ↓              ↓
Single Map   All Types     Manual Updates
```

### Target (NgRx Signal Store):
```
Supabase Configs → ConfigLoader → DynamicUniversalStore → UI
       ↓               ↓                    ↓              ↓
   app_config    IndexedDB Cache    NgRx Features    Auto Updates
```

## 📋 Migration Steps

### Phase 1: Setup (Week 1)

#### 1.1 Install Dependencies
```bash
npm install @ngrx/signals @ngrx/signals/entities @ngrx/operators
npm install @ngrx/signals/rxjs-interop # for rxMethod
```

#### 1.2 Create Config Types
```typescript
// packages/signal-store/src/types/collection-config.ts
export interface CollectionConfig {
  id: string;
  collection_name: string;
  entity_type: string;
  schema: {
    required: string[];
    indexed: string[];
    unique: string[];
    relations: Record<string, RelationConfig>;
  };
  computed_fields?: ComputedFieldConfig[];
  custom_methods?: MethodConfig[];
  sync_config?: SyncConfig;
  ui_config?: UIConfig;
}
```

#### 1.3 Config Loader Service
```typescript
// packages/signal-store/src/services/config-loader.service.ts
@Injectable({ providedIn: 'root' })
export class ConfigLoaderService {
  private configs = new Map<string, CollectionConfig>();
  
  async loadConfigs(): Promise<CollectionConfig[]> {
    const { data } = await supabase
      .from('app_config')
      .select('*')
      .like('key', '%_collection_config');
    
    // Cache in IndexedDB for offline
    await this.cacheConfigs(data);
    
    // Setup real-time subscriptions
    this.subscribeToConfigChanges();
    
    return data;
  }
}
```

### Phase 2: Dynamic Store Generation (Week 2)

#### 2.1 Feature Generator
```typescript
// packages/signal-store/src/features/generate-features.ts
export function generateFeaturesFromConfig(config: CollectionConfig) {
  const features = [];
  
  // 1. Entities
  features.push(
    withEntities({
      entity: type(config.entity_type),
      collection: config.collection_name,
      selectId: (e) => e.id
    })
  );
  
  // 2. Computed
  if (config.computed_fields) {
    features.push(
      withComputed(generateComputedFields(config))
    );
  }
  
  // 3. Methods
  features.push(
    withMethods(generateCRUDMethods(config))
  );
  
  // 4. Hooks
  features.push(
    withHooks(generateLifecycleHooks(config))
  );
  
  return features;
}
```

#### 2.2 Universal Store
```typescript
// packages/signal-store/src/stores/dynamic-universal.store.ts
export const DynamicUniversalStore = await (async () => {
  const configLoader = inject(ConfigLoaderService);
  const configs = await configLoader.loadConfigs();
  
  return signalStore(
    { providedIn: 'root' },
    
    // Dynamic features from configs
    ...configs.flatMap(config => 
      generateFeaturesFromConfig(config)
    ),
    
    // Global features
    withState({
      syncStatus: 'idle',
      collections: configs.map(c => c.collection_name)
    }),
    
    // Cross-collection computed
    withComputed((store) => ({
      entitiesWithRelations: computed(() => 
        resolveRelations(store, configs)
      )
    })),
    
    // Global methods
    withMethods((store) => ({
      syncAll: () => syncAllCollections(store, configs),
      reloadConfigs: () => reloadAndRegenerate()
    }))
  );
})();
```

### Phase 3: Custom NgRx Features (Week 3)

#### 3.1 withSupabaseSync
```typescript
export function withSupabaseSync<T>(config: SyncConfig) {
  return signalStoreFeature(
    withState({ 
      syncStatus: 'idle',
      lastSync: null 
    }),
    
    withMethods((store, supabase = inject(SupabaseClient)) => ({
      sync: async () => {
        patchState(store, { syncStatus: 'syncing' });
        
        const { data, error } = await supabase
          .from(config.table)
          .select('*');
        
        if (!error) {
          patchState(store, 
            setAllEntities(data, { collection: config.collection }),
            { syncStatus: 'synced', lastSync: new Date() }
          );
        }
      },
      
      subscribeToChanges: () => {
        supabase
          .channel(`${config.table}_changes`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: config.table 
          }, handleRealtimeUpdate)
          .subscribe();
      }
    })),
    
    withHooks({
      onInit(store) {
        store.sync();
        store.subscribeToChanges();
      }
    })
  );
}
```

#### 3.2 withOfflineSupport
```typescript
export function withOfflineSupport<T>() {
  return signalStoreFeature(
    withState({ 
      offlineQueue: [],
      isOnline: navigator.onLine 
    }),
    
    withMethods((store) => ({
      queueOperation: (op: Operation) => {
        if (!store.isOnline()) {
          patchState(store, {
            offlineQueue: [...store.offlineQueue(), op]
          });
        }
      },
      
      processQueue: async () => {
        const queue = store.offlineQueue();
        for (const op of queue) {
          await processOperation(op);
        }
        patchState(store, { offlineQueue: [] });
      }
    })),
    
    withHooks({
      onInit() {
        window.addEventListener('online', () => {
          patchState(store, { isOnline: true });
          store.processQueue();
        });
        
        window.addEventListener('offline', () => {
          patchState(store, { isOnline: false });
        });
      }
    })
  );
}
```

#### 3.3 withSearch
```typescript
export function withSearch<T>() {
  return signalStoreFeature(
    withState({
      searchQuery: '',
      searchFields: []
    }),
    
    withComputed(({ entities, searchQuery }) => ({
      searchResults: computed(() => {
        const query = searchQuery().toLowerCase();
        if (!query) return entities();
        
        return entities().filter(entity =>
          JSON.stringify(entity).toLowerCase().includes(query)
        );
      })
    })),
    
    withMethods((store) => ({
      search: (query: string) => {
        patchState(store, { searchQuery: query });
      }
    }))
  );
}
```

### Phase 4: Component Migration (Week 4)

#### 4.1 Update Injections
```typescript
// OLD
export class BreedsComponent {
  multiStore = inject(MultiStore);
  
  breeds = computed(() => 
    this.multiStore.getEntitiesByType('breed')
  );
}

// NEW
export class BreedsComponent {
  store = inject(DynamicUniversalStore);
  
  breeds = this.store.breedsEntities; // Auto-generated signal
}
```

#### 4.2 Update Templates
```html
<!-- OLD -->
<div *ngFor="let breed of breeds()">
  <button (click)="multiStore.updateEntity(breed.id, changes)">
    Update
  </button>
</div>

<!-- NEW -->
<div *ngFor="let breed of store.breedsEntities()">
  <button (click)="store.updateBreed(breed.id, changes)">
    Update
  </button>
</div>
```

#### 4.3 Migration Utilities
```typescript
// Compatibility layer during migration
export function createMultiStoreAdapter(store: DynamicUniversalStore) {
  return {
    getEntitiesByType(type: string) {
      const getter = store[`${type}sEntities`];
      return getter ? getter() : [];
    },
    
    addEntity(entity: any) {
      const method = store[`add${capitalize(entity._type)}`];
      if (method) method(entity);
    },
    
    updateEntity(id: string, changes: any) {
      // Find collection and update
      store.collections().forEach(collection => {
        const updateMethod = store[`update${capitalize(collection)}`];
        if (updateMethod) updateMethod(id, changes);
      });
    }
  };
}
```

## 📊 Migration Checklist

### Week 1: Foundation
- [ ] Install @ngrx/signals packages
- [ ] Create CollectionConfig types
- [ ] Setup ConfigLoaderService
- [ ] Create Supabase config structure
- [ ] Test config loading

### Week 2: Store Generation
- [ ] Implement feature generators
- [ ] Create DynamicUniversalStore
- [ ] Setup global features
- [ ] Test store generation
- [ ] Verify type safety

### Week 3: Custom Features
- [ ] Implement withSupabaseSync
- [ ] Implement withOfflineSupport
- [ ] Implement withSearch
- [ ] Create withPagination
- [ ] Test all features

### Week 4: Migration
- [ ] Create compatibility adapter
- [ ] Migrate BreedsComponent
- [ ] Migrate PetsComponent
- [ ] Migrate KennelsComponent
- [ ] Migrate ContactsComponent
- [ ] Update routing
- [ ] Update tests

### Week 5: Cleanup
- [ ] Remove MultiStore code
- [ ] Update documentation
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Deploy to staging

## 🎯 Success Metrics

### Performance
- [ ] Store initialization < 100ms
- [ ] Entity updates < 10ms
- [ ] Search response < 50ms
- [ ] Memory usage < 50MB

### Code Quality
- [ ] 100% type coverage
- [ ] Zero runtime errors
- [ ] All tests passing
- [ ] Lighthouse score > 95

### Developer Experience
- [ ] IntelliSense working
- [ ] DevTools integration
- [ ] Hot reload working
- [ ] Clear error messages

## ⚠️ Rollback Plan

### Feature Flags
```typescript
if (featureFlags.useNgRxSignalStore) {
  return DynamicUniversalStore;
} else {
  return createMultiStore(); // Legacy
}
```

### Data Backup
1. Export all MultiStore data before migration
2. Keep backup for 30 days
3. Test restore procedure

### Gradual Rollout
1. Start with 10% of users
2. Monitor for 48 hours
3. Increase to 50% if stable
4. Full rollout after 1 week

## 📚 Resources

### Documentation
- [NgRx Signals Guide](https://ngrx.io/guide/signals)
- [NgRx Signals API](https://ngrx.io/api/signals)
- [Signal Store Examples](https://github.com/ngrx/platform/tree/master/projects/ngrx.io/content/examples/signal-store)

### Tools
- [NgRx DevTools](https://chrome.google.com/webstore/detail/redux-devtools)
- [Angular DevTools](https://angular.io/guide/devtools)

### Support
- NgRx Discord: https://discord.gg/ngrx
- Stack Overflow: [ngrx-signals] tag
- GitHub Issues: https://github.com/ngrx/platform/issues

## ✅ Conclusion

Міграція на NgRx Signal Store дасть:
1. **Better performance** - оптимізовані signal updates
2. **Type safety** - автоматична типізація
3. **Maintainability** - config-driven approach
4. **Extensibility** - custom features
5. **Community support** - широке використання

**Timeline:** 5 weeks
**Risk:** Low (with feature flags)
**ROI:** High (reduced maintenance, better DX)