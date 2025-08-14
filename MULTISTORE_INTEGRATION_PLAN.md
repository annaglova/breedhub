# MultiStore Integration Plan for BreedHub

## Overview
План поетапної інтеграції MultiStore архітектури в основний додаток BreedHub.

## Фаза 1: Підготовка (1-2 дні)

### 1.1 Динамічні схеми в БД
```typescript
// Нова структура для схем entities
interface DynamicEntitySchema {
  id: string;
  entityType: string;           // 'custom_health_check'
  extends?: string;              // 'base_entity' | 'breed' | 'pet'
  
  fields: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'reference';
    required: boolean;
    defaultValue?: any;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;         // RegExp as string
      options?: any[];          // For enums
      referenceType?: string;   // For references
    };
    ui?: {
      label: string;
      placeholder?: string;
      helpText?: string;
      widget?: 'text' | 'textarea' | 'select' | 'date' | 'toggle';
      hidden?: boolean;
      readonly?: boolean;
    };
  }[];
  
  permissions: {
    create: string[];           // Role IDs
    read: string[];
    update: string[];
    delete: string[];
  };
  
  ui: {
    icon?: string;
    color?: string;
    listColumns?: string[];
    searchFields?: string[];
    sortFields?: string[];
  };
  
  hooks?: {
    beforeCreate?: string;      // JavaScript code as string
    afterCreate?: string;
    beforeUpdate?: string;
    afterUpdate?: string;
    beforeDelete?: string;
  };
}
```

### 1.2 Schema Registry
```typescript
// Централізований реєстр схем
class SchemaRegistry {
  private schemas = new Map<string, DynamicEntitySchema>();
  private validators = new Map<string, Function>();
  
  registerSchema(schema: DynamicEntitySchema) {
    // Compile validation function
    const validator = this.compileValidator(schema);
    this.validators.set(schema.entityType, validator);
    this.schemas.set(schema.entityType, schema);
  }
  
  validateEntity(entity: AnyEntity): ValidationResult {
    const schema = this.schemas.get(entity._type);
    if (!schema) {
      // Fallback to built-in validators
      return validateEntity(entity);
    }
    
    const validator = this.validators.get(entity._type);
    return validator(entity);
  }
}
```

### 1.3 Migration Scripts
```typescript
// Міграція існуючих даних
async function migrateToMultiStore() {
  // 1. Backup existing data
  const backup = await backupCurrentData();
  
  // 2. Create default workspace
  const workspace = await createDefaultWorkspace();
  
  // 3. Migrate each collection
  for (const collection of ['breeds', 'pets', 'kennels', 'contacts']) {
    const space = await createSpace(workspace.id, collection);
    const data = await getCollectionData(collection);
    
    for (const item of data) {
      await multiStore.addEntity({
        ...item,
        _type: collection.slice(0, -1), // 'breeds' -> 'breed'
        _parentId: space.id
      });
    }
  }
  
  // 4. Verify migration
  const validation = multiStore.validateStore();
  if (!validation.isValid) {
    await rollback(backup);
    throw new Error('Migration failed validation');
  }
}
```

## Фаза 2: Core Integration (2-3 дні)

### 2.1 Заміна Store Layer
```typescript
// Before (старий підхід)
const breedsStore = createBreedsStore();
const petsStore = createPetsStore();

// After (MultiStore)
const multiStore = createMultiStore();
const breedsSpace = multiStore.getActiveSpace('breeds');
```

### 2.2 Оновлення компонентів
```typescript
// Створити адаптери для backward compatibility
function useBreeds() {
  const multiStore = useMultiStore();
  const breeds = multiStore.getEntitiesByType('breed');
  
  return {
    breeds,
    addBreed: (breed) => multiStore.addEntity({ ...breed, _type: 'breed' }),
    updateBreed: (id, updates) => multiStore.updateEntity(id, updates),
    deleteBreed: (id) => multiStore.removeEntity(id)
  };
}
```

### 2.3 IndexedDB Integration
```typescript
// Автоматична синхронізація
const syncAdapter = {
  serialize: (entity: AnyEntity) => {
    // Convert dates to ISO strings
    return JSON.stringify(entity);
  },
  
  deserialize: (data: string) => {
    const parsed = JSON.parse(data);
    // Convert ISO strings back to dates
    return parsed;
  },
  
  sync: async () => {
    const entities = multiStore.findEntities(() => true);
    await indexedDB.bulkPut('entities', entities);
  }
};
```

## Фаза 3: UI Updates (1-2 дні)

### 3.1 Dynamic Forms
```typescript
// Генерація форм на основі схем
function DynamicEntityForm({ schema, entity, onSave }) {
  const form = useForm({
    defaultValues: entity || schema.fields.reduce((acc, field) => ({
      ...acc,
      [field.name]: field.defaultValue
    }), {})
  });
  
  return (
    <form onSubmit={form.handleSubmit(onSave)}>
      {schema.fields.map(field => (
        <DynamicField
          key={field.name}
          field={field}
          control={form.control}
        />
      ))}
    </form>
  );
}
```

### 3.2 Universal List/Grid Components
```typescript
// Універсальний компонент для всіх типів entities
function EntityList({ entityType, spaceId }) {
  const multiStore = useMultiStore();
  const entities = multiStore.getEntitiesByParent(spaceId);
  const schema = useSchema(entityType);
  
  return (
    <DataGrid
      columns={schema.ui.listColumns}
      data={entities}
      onEdit={(entity) => openEditDialog(entity)}
      onDelete={(id) => multiStore.removeEntity(id)}
    />
  );
}
```

## Фаза 4: Advanced Features (опціонально)

### 4.1 Custom Entity Types через UI
```typescript
// Admin panel для створення нових типів
function SchemaBuilder() {
  const [schema, setSchema] = useState<DynamicEntitySchema>({
    entityType: '',
    fields: [],
    permissions: {},
    ui: {}
  });
  
  const saveSchema = async () => {
    await api.saveSchema(schema);
    schemaRegistry.registerSchema(schema);
    toast.success('New entity type created!');
  };
  
  return <SchemaBuilderUI schema={schema} onChange={setSchema} onSave={saveSchema} />;
}
```

### 4.2 Computed Fields
```typescript
// Додати computed fields до схем
interface ComputedField {
  name: string;
  dependencies: string[];
  compute: string; // JavaScript expression
}

// Приклад
{
  name: 'age',
  dependencies: ['birthDate'],
  compute: 'Math.floor((Date.now() - new Date(birthDate)) / 31536000000)'
}
```

### 4.3 Workflow Engine
```typescript
// Стани та переходи для entities
interface Workflow {
  states: {
    id: string;
    name: string;
    permissions: string[];
  }[];
  
  transitions: {
    from: string;
    to: string;
    condition?: string;
    action?: string;
  }[];
}
```

## Benefits of Dynamic Schemas in DB

### 1. **Flexibility**
- Користувачі можуть створювати власні типи без зміни коду
- Різні організації можуть мати різні поля

### 2. **Versioning**
```typescript
// Легко версіонувати схеми
interface SchemaVersion {
  version: number;
  schema: DynamicEntitySchema;
  migrationUp?: string;
  migrationDown?: string;
}
```

### 3. **Multi-tenancy**
```typescript
// Кожен tenant може мати свої схеми
const tenantSchemas = await db.schemas.find({ tenantId });
```

### 4. **A/B Testing**
```typescript
// Тестувати різні схеми
const schema = await getSchemaVariant(userId, 'breed_schema');
```

### 5. **Permission-based Fields**
```typescript
// Показувати різні поля різним ролям
const visibleFields = schema.fields.filter(f => 
  hasPermission(user, f.permissions.view)
);
```

## Migration Timeline

### Week 1
- ✅ Day 1-2: Create MultiStore architecture
- ⬜ Day 3-4: Setup dynamic schemas in DB
- ⬜ Day 5-6: Create migration scripts

### Week 2
- ⬜ Day 1-2: Integrate MultiStore in main app
- ⬜ Day 3-4: Update UI components
- ⬜ Day 5-6: Testing and bug fixes

### Week 3 (Optional)
- ⬜ Day 1-2: Schema builder UI
- ⬜ Day 3-4: Advanced features
- ⬜ Day 5-6: Performance optimization

## Rollback Plan

1. **Feature Flags**
```typescript
if (featureFlags.useMultiStore) {
  return multiStore;
} else {
  return legacyStore;
}
```

2. **Data Backup**
- Backup before migration
- Keep old store code for 30 days
- Dual-write during transition

3. **Gradual Migration**
- Start with one entity type
- Monitor performance
- Migrate others if successful

## Success Metrics

1. **Performance**
   - Query time < 50ms
   - Memory usage < 100MB
   - IndexedDB sync < 1s

2. **Reliability**
   - Zero data loss
   - 99.9% uptime
   - Validation coverage 100%

3. **Developer Experience**
   - Reduced code complexity by 50%
   - New entity type in < 5 minutes
   - AI agents success rate > 95%

## Conclusion

MultiStore з динамічними схемами в БД дасть:
1. **Гнучкість** - нові типи без коду
2. **Масштабованість** - multi-tenancy ready
3. **Простоту** - один патерн для всього
4. **AI-friendly** - легко для AI агентів

Це революційний підхід, який зробить BreedHub справді універсальною платформою!