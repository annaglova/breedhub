# Pedigree (Родовід) Architecture - GraphQL Implementation

**Дата:** 2025-10-28
**Статус:** 🟡 Planning Phase
**Зв'язок:** Частина Public Page для Pet entity

---

## 📋 Executive Summary

**Проблема:** Родовід (pedigree) вимагає завантаження **7+ поколінь предків** (до 127 pets в одному дереві). REST API створює 100+ запитів або один величезний нечитабельний nested join.

**Рішення:** **GraphQL** для pedigree queries + окремий **PedigreeStore** для graph logic.

**Scope:**
- Тільки pedigree використовує GraphQL
- Решта app залишається на Supabase REST
- Hybrid architecture: right tool for the job

**Benefits:**
- ✅ Один GraphQL query замість 127 REST requests
- ✅ Контрольована глибина рекурсії
- ✅ Type-safe auto-generated types
- ✅ Offline-first з RxDB кешуванням
- ✅ Ізольована складність в PedigreeStore

---

## 🌳 Problem Statement: Чому REST не підходить

### Структура Родоводу

```
                    Great-Great-Grandfather
                   /
        Great-Grandfather
       /           \
      /             Great-Great-Grandmother
Grandfather
      \             Great-Great-Grandfather
       \           /
        Great-Grandmother
                   \
                    Great-Great-Grandmother
Father
      \
       (mirror structure for Grandmother)

Pet
   \
    Mother
      \
       (mirror structure for Mother's side)
```

**7 поколінь вверх:**
- Generation 1: 1 pet (child)
- Generation 2: 2 parents
- Generation 3: 4 grandparents
- Generation 4: 8 great-grandparents
- Generation 5: 16
- Generation 6: 32
- Generation 7: 64 ancestors

**Total: 127 pets в одному родоводі!**

---

### ❌ REST Approach 1: N+1 Query Problem

```typescript
// Наївний підхід - КАТАСТРОФА!
async function loadPedigree(petId: string, depth: number = 7) {
  const pet = await supabase.from('pet').select('*').eq('id', petId).single();

  if (depth > 0) {
    // 2 requests на кожному рівні
    pet.father = await loadPedigree(pet.father_id, depth - 1);
    pet.mother = await loadPedigree(pet.mother_id, depth - 1);
  }

  return pet;
}

// Result: 127 HTTP requests! 😱
```

**Проблеми:**
- 127 окремих HTTP requests
- Waterfall effect (кожен рівень чекає попередній)
- Network latency × 127
- Database connections × 127
- Повільно навіть з хорошим інтернетом

---

### ❌ REST Approach 2: Mega Nested Join

```typescript
const pedigree = await supabase
  .from('pet')
  .select(`
    id, name, avatar_url, birth_date, gender,
    father:pet!father_id(
      id, name, avatar_url, birth_date, gender,
      father:pet!father_id(
        id, name, avatar_url, birth_date, gender,
        father:pet!father_id(
          id, name, avatar_url, birth_date, gender,
          father:pet!father_id(
            id, name, avatar_url, birth_date, gender,
            father:pet!father_id(
              id, name, avatar_url, birth_date, gender,
              father:pet!father_id(
                id, name, avatar_url, birth_date, gender
              ),
              mother:pet!mother_id(
                id, name, avatar_url, birth_date, gender
              )
            ),
            mother:pet!mother_id(
              id, name, avatar_url, birth_date, gender,
              father:pet!father_id(...),
              mother:pet!mother_id(...)
            )
          ),
          mother:pet!mother_id(
            ... ще 5 рівнів вкладеності
          )
        ),
        mother:pet!mother_id(
          ... ще 5 рівнів вкладеності
        )
      ),
      mother:pet!mother_id(
        ... ще 6 рівнів вкладеності
      )
    ),
    mother:pet!mother_id(
      ... дзеркальна структура для матері
    )
  `)
  .eq('id', petId)
  .single();
```

**Проблеми:**
- ❌ Нечитабельний код (500+ lines query!)
- ❌ Важко змінювати depth
- ❌ Важко додавати/видаляти поля
- ❌ Over-fetching - завантажує ВСЕ одразу (не можна lazy load рівні)
- ❌ Складний SQL join під капотом
- ❌ Важко кешувати проміжні рівні

---

### ❌ REST Approach 3: Custom Endpoint

```typescript
// GET /api/pedigree/:petId?depth=7
app.get('/api/pedigree/:petId', async (req, res) => {
  const tree = await buildPedigreeRecursive(req.params.petId, req.query.depth);
  res.json(tree);
});
```

**Проблеми:**
- ⚠️ Custom endpoint для кожного graph use case
- ⚠️ Важко підтримувати (ще один API endpoint)
- ⚠️ Немає flexibility - завжди повертає фіксовану структуру
- ⚠️ Не можна вибрати тільки потрібні поля

---

## ✅ GraphQL Solution

### Simple Query (читабельно!)

```graphql
query PetPedigree($petId: UUID!, $depth: Int = 7) {
  pet(id: $petId) {
    id
    name
    avatar_url
    birth_date
    gender
    breed {
      id
      name
    }

    # Recursive ancestors
    ...AncestorFields
  }
}

fragment AncestorFields on Pet {
  father {
    id
    name
    avatar_url
    birth_date
    gender

    # 🔄 Рекурсія - контрольована depth
    ...AncestorFields @include(if: $shouldGoDeeper)
  }

  mother {
    id
    name
    avatar_url
    birth_date
    gender

    ...AncestorFields @include(if: $shouldGoDeeper)
  }
}
```

**Переваги:**
- ✅ Читабельний код
- ✅ Гнучка глибина (просто змінити `$depth`)
- ✅ Вибір полів (тільки потрібні)
- ✅ Один HTTP request
- ✅ Server-side optimization

---

### Alternative: Flattened Query

```graphql
query PetPedigreeFlat($petId: UUID!, $depth: Int = 7) {
  pet(id: $petId) {
    id
    name

    # Повертає flat list всіх ancestors
    ancestors(depth: $depth) {
      id
      name
      avatar_url
      birth_date
      gender
      generation        # 1, 2, 3, ..., 7
      relationship      # "father", "mother", "paternal_grandfather", etc.
      path              # ["father", "father", "father"] - path to root
    }
  }
}
```

**Response:**
```json
{
  "pet": {
    "id": "pet_123",
    "name": "Fluffy",
    "ancestors": [
      {
        "id": "pet_456",
        "name": "Father",
        "generation": 1,
        "relationship": "father",
        "path": ["father"]
      },
      {
        "id": "pet_789",
        "name": "Paternal Grandfather",
        "generation": 2,
        "relationship": "paternal_grandfather",
        "path": ["father", "father"]
      }
      // ... 125 more ancestors
    ]
  }
}
```

**Переваги:**
- ✅ Простіше парсити на client
- ✅ Легше конвертувати в D3.js tree
- ✅ Можна фільтрувати по generation
- ✅ Зручно для таблиці (flat list)

---

## 🏗️ Architecture Overview

### Hybrid Approach

```
┌─────────────────────────────────────────────────┐
│              React App (PWA)                    │
├─────────────────────────────────────────────────┤
│  SpaceStore          │  PedigreeStore          │
│  (REST)              │  (GraphQL)              │
│  ↓                   │  ↓                      │
│  Main entities       │  Pedigree trees         │
│  Child tables        │  Ancestors/Descendants  │
├─────────────────────────────────────────────────┤
│           RxDB (IndexedDB Cache)                │
│  - breed collection  │  - pedigree_cache       │
│  - pet collection    │    collection           │
│  - breed_children    │                         │
├─────────────────────────────────────────────────┤
│  Supabase REST API   │  GraphQL Server         │
│  (PostgREST)         │  (Hasura / Custom)      │
└─────────────────────────────────────────────────┘
            ↓                      ↓
      ┌──────────────────────────────┐
      │   PostgreSQL Database        │
      │   - pet table (father_id,    │
      │     mother_id FK)             │
      └──────────────────────────────┘
```

### Store Responsibilities

| Store | Responsibility | Technology |
|-------|---------------|------------|
| **SpaceStore** | Main entities (breed, pet, kennel), Child tables (divisions, synonyms) | Supabase REST + RxDB |
| **PedigreeStore** | Pedigree trees (ancestors, descendants) | **GraphQL** + RxDB cache |
| **DictionaryStore** | Global reference data (pet_type, breed_group) | Supabase REST + RxDB |

---

## 📦 PedigreeStore Implementation

### Store Structure

```typescript
/**
 * PedigreeStore - manages pedigree trees using GraphQL
 * Isolated complexity for graph queries
 */
class PedigreeStore {
  private static instance: PedigreeStore;

  // GraphQL client
  private graphqlClient: ApolloClient<any>;

  // RxDB database reference
  private db: any = null;

  // Reactive cache для pedigree trees
  private pedigreeCache = new Map<string, Signal<PedigreeData>>();

  // Configuration
  private readonly DEFAULT_DEPTH = 7;
  private readonly CACHE_TTL_HOURS = 24; // Родовід рідко міняється

  private constructor() {
    this.initializeGraphQLClient();
  }

  static getInstance(): PedigreeStore {
    if (!PedigreeStore.instance) {
      PedigreeStore.instance = new PedigreeStore();
    }
    return PedigreeStore.instance;
  }

  /**
   * Initialize GraphQL client (Apollo)
   */
  private initializeGraphQLClient() {
    this.graphqlClient = new ApolloClient({
      uri: process.env.GRAPHQL_ENDPOINT || 'https://api.breedhub.com/graphql',
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-first',
        },
        query: {
          fetchPolicy: 'cache-first',
        },
      },
    });
  }

  /**
   * Get pedigree tree для pet (reactive)
   * Returns Signal with loading/error states
   */
  getPedigree(
    petId: string,
    options?: {
      depth?: number;
      direction?: 'ancestors' | 'descendants' | 'both';
      forceRefresh?: boolean;
    }
  ): Signal<PedigreeData> {
    const depth = options?.depth || this.DEFAULT_DEPTH;
    const direction = options?.direction || 'ancestors';
    const cacheKey = `${petId}:${direction}:${depth}`;

    // Return cached signal if exists and not force refresh
    if (!options?.forceRefresh && this.pedigreeCache.has(cacheKey)) {
      return this.pedigreeCache.get(cacheKey)!;
    }

    // Create new signal
    const pedigreeSignal = signal<PedigreeData>({
      loading: true,
      tree: null,
      flatList: null,
      statistics: null,
      error: null
    });

    this.pedigreeCache.set(cacheKey, pedigreeSignal);

    // Load data асинхронно
    this.loadPedigreeAsync(petId, depth, direction, pedigreeSignal);

    return pedigreeSignal;
  }

  /**
   * Internal: Load pedigree from GraphQL or cache
   */
  private async loadPedigreeAsync(
    petId: string,
    depth: number,
    direction: 'ancestors' | 'descendants' | 'both',
    pedigreeSignal: Signal<PedigreeData>
  ) {
    try {
      // 1. Check RxDB cache first (offline-first)
      const cached = await this.getFromCache(petId, depth, direction);

      if (cached && !this.isCacheExpired(cached)) {
        console.log(`[PedigreeStore] Using cached pedigree for ${petId}`);
        pedigreeSignal.value = {
          loading: false,
          tree: cached.tree,
          flatList: cached.flatList,
          statistics: cached.statistics,
          error: null,
          fromCache: true
        };
        return;
      }

      // 2. Fetch from GraphQL
      console.log(`[PedigreeStore] Fetching pedigree from GraphQL for ${petId}`);

      const result = await this.graphqlClient.query({
        query: PEDIGREE_QUERY,
        variables: {
          petId,
          depth,
          includeAncestors: direction === 'ancestors' || direction === 'both',
          includeDescendants: direction === 'descendants' || direction === 'both'
        }
      });

      // 3. Process data
      const tree = result.data.pet;
      const flatList = this.flattenPedigreeTree(tree, direction);
      const statistics = this.calculateStatistics(flatList);

      // 4. Cache in RxDB
      await this.saveToCache(petId, depth, direction, {
        tree,
        flatList,
        statistics
      });

      // 5. Update signal
      pedigreeSignal.value = {
        loading: false,
        tree,
        flatList,
        statistics,
        error: null,
        fromCache: false
      };

    } catch (error) {
      console.error('[PedigreeStore] Failed to load pedigree:', error);

      pedigreeSignal.value = {
        loading: false,
        tree: null,
        flatList: null,
        statistics: null,
        error: error as Error,
        fromCache: false
      };
    }
  }

  /**
   * Flatten tree structure to list
   * Зручно для таблиць та аналізу
   */
  private flattenPedigreeTree(
    tree: any,
    direction: 'ancestors' | 'descendants' | 'both',
    currentGeneration: number = 0,
    path: string[] = []
  ): PedigreeFlatNode[] {
    const nodes: PedigreeFlatNode[] = [];

    if (!tree) return nodes;

    // Current node
    if (currentGeneration > 0) {
      nodes.push({
        id: tree.id,
        name: tree.name,
        avatar_url: tree.avatar_url,
        birth_date: tree.birth_date,
        gender: tree.gender,
        breed: tree.breed,
        generation: currentGeneration,
        path: [...path],
        relationship: this.calculateRelationship(path)
      });
    }

    // Recursive ancestors
    if (direction === 'ancestors' || direction === 'both') {
      if (tree.father) {
        nodes.push(...this.flattenPedigreeTree(
          tree.father,
          direction,
          currentGeneration + 1,
          [...path, 'father']
        ));
      }

      if (tree.mother) {
        nodes.push(...this.flattenPedigreeTree(
          tree.mother,
          direction,
          currentGeneration + 1,
          [...path, 'mother']
        ));
      }
    }

    // Recursive descendants
    if (direction === 'descendants' || direction === 'both') {
      if (tree.children) {
        tree.children.forEach((child: any) => {
          nodes.push(...this.flattenPedigreeTree(
            child,
            direction,
            currentGeneration + 1,
            [...path, 'child']
          ));
        });
      }
    }

    return nodes;
  }

  /**
   * Calculate relationship label from path
   */
  private calculateRelationship(path: string[]): string {
    if (path.length === 0) return 'self';
    if (path.length === 1) return path[0]; // "father" or "mother"

    // Generate readable labels
    const relationshipMap: Record<string, string> = {
      'father,father': 'paternal_grandfather',
      'father,mother': 'paternal_grandmother',
      'mother,father': 'maternal_grandfather',
      'mother,mother': 'maternal_grandmother',
      'father,father,father': 'paternal_great_grandfather',
      // ... можна розширити
    };

    const key = path.join(',');
    return relationshipMap[key] || `generation_${path.length}`;
  }

  /**
   * Calculate pedigree statistics
   * - Inbreeding coefficient
   * - Unique ancestors count
   * - Breed diversity
   */
  private calculateStatistics(flatList: PedigreeFlatNode[]): PedigreeStatistics {
    // Count unique ancestors
    const uniqueAncestors = new Set(flatList.map(n => n.id)).size;

    // Expected ancestors for complete pedigree
    const maxGeneration = Math.max(...flatList.map(n => n.generation), 0);
    const expectedAncestors = Math.pow(2, maxGeneration) - 1;

    // Completeness percentage
    const completeness = (uniqueAncestors / expectedAncestors) * 100;

    // Breed diversity
    const breeds = flatList.map(n => n.breed?.id).filter(Boolean);
    const uniqueBreeds = new Set(breeds).size;

    return {
      totalAncestors: flatList.length,
      uniqueAncestors,
      expectedAncestors,
      completeness: Math.round(completeness),
      maxGeneration,
      uniqueBreeds,
      // TODO: Calculate inbreeding coefficient (Wright's coefficient)
      inbreedingCoefficient: 0
    };
  }

  /**
   * Get from RxDB cache
   */
  private async getFromCache(
    petId: string,
    depth: number,
    direction: string
  ): Promise<CachedPedigree | null> {
    if (!this.db?.pedigree_cache) return null;

    const cacheKey = `${petId}:${direction}:${depth}`;
    const doc = await this.db.pedigree_cache.findOne(cacheKey).exec();

    return doc ? doc.toJSON() : null;
  }

  /**
   * Save to RxDB cache
   */
  private async saveToCache(
    petId: string,
    depth: number,
    direction: string,
    data: any
  ): Promise<void> {
    if (!this.db?.pedigree_cache) return;

    const cacheKey = `${petId}:${direction}:${depth}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.CACHE_TTL_HOURS);

    await this.db.pedigree_cache.upsert({
      id: cacheKey,
      pet_id: petId,
      depth,
      direction,
      tree: data.tree,
      flatList: data.flatList,
      statistics: data.statistics,
      cached_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    });
  }

  /**
   * Check if cache expired
   */
  private isCacheExpired(cached: CachedPedigree): boolean {
    const expiresAt = new Date(cached.expires_at);
    return expiresAt < new Date();
  }

  /**
   * Format tree for D3.js visualization
   */
  formatForD3Tree(tree: any): D3TreeNode {
    return {
      name: tree.name,
      attributes: {
        id: tree.id,
        avatar: tree.avatar_url,
        birthDate: tree.birth_date,
        gender: tree.gender
      },
      children: [
        tree.father ? this.formatForD3Tree(tree.father) : null,
        tree.mother ? this.formatForD3Tree(tree.mother) : null
      ].filter(Boolean)
    };
  }

  /**
   * Find common ancestors between two pets
   */
  async findCommonAncestors(pet1Id: string, pet2Id: string): Promise<CommonAncestor[]> {
    const pedigree1 = this.getPedigree(pet1Id);
    const pedigree2 = this.getPedigree(pet2Id);

    // Wait for both to load
    await Promise.all([
      new Promise(resolve => {
        if (!pedigree1.value.loading) resolve(true);
      }),
      new Promise(resolve => {
        if (!pedigree2.value.loading) resolve(true);
      })
    ]);

    const ancestors1 = new Set(pedigree1.value.flatList?.map(n => n.id));
    const ancestors2 = pedigree2.value.flatList || [];

    return ancestors2
      .filter(node => ancestors1.has(node.id))
      .map(node => ({
        ...node,
        commonAncestor: true
      }));
  }

  /**
   * Calculate inbreeding coefficient (Wright's formula)
   * TODO: Implement Wright's coefficient calculation
   */
  async calculateInbreedingCoefficient(petId: string): Promise<number> {
    // This is complex - requires path analysis
    // Will implement in separate phase
    return 0;
  }

  /**
   * Clear cache for specific pet (when pedigree updated)
   */
  async invalidateCache(petId: string) {
    if (!this.db?.pedigree_cache) return;

    // Remove all cache entries for this pet
    const docs = await this.db.pedigree_cache
      .find({
        selector: {
          pet_id: petId
        }
      })
      .exec();

    for (const doc of docs) {
      await doc.remove();
    }

    // Clear memory cache
    for (const [key] of this.pedigreeCache) {
      if (key.startsWith(`${petId}:`)) {
        this.pedigreeCache.delete(key);
      }
    }
  }
}

export const pedigreeStore = PedigreeStore.getInstance();
```

---

## 🗄️ RxDB Schema для Pedigree Cache

```typescript
const pedigreeCacheSchema: RxJsonSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100  // "petId:direction:depth"
    },
    pet_id: {
      type: 'string',
      maxLength: 36
    },
    depth: {
      type: 'number'
    },
    direction: {
      type: 'string',
      maxLength: 20  // 'ancestors', 'descendants', 'both'
    },
    tree: {
      type: 'object'  // Nested tree structure
    },
    flatList: {
      type: 'array',
      items: {
        type: 'object'
      }
    },
    statistics: {
      type: 'object'
    },
    cached_at: {
      type: 'string'
    },
    expires_at: {
      type: 'string'
    }
  },
  required: ['id', 'pet_id', 'depth', 'direction', 'cached_at', 'expires_at'],
  indexes: [
    'pet_id',
    'cached_at',
    'expires_at'
  ]
};

// Add collection
await db.addCollections({
  pedigree_cache: {
    schema: pedigreeCacheSchema
  }
});
```

---

## 🎨 UI Components

### Component Usage

```typescript
function PetPublicPage() {
  const { petId, tabId } = useParams();

  // Pedigree tab
  if (tabId === 'pedigree') {
    return <PedigreeTab petId={petId} />;
  }

  // Other tabs...
}

function PedigreeTab({ petId }: { petId: string }) {
  useSignals();

  // Get reactive pedigree data
  const pedigreeData = pedigreeStore.getPedigree(petId, {
    depth: 7,
    direction: 'ancestors'
  });

  if (pedigreeData.value.loading) {
    return <PedigreeTreeSkeleton />;
  }

  if (pedigreeData.value.error) {
    return <ErrorMessage error={pedigreeData.value.error} />;
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <PedigreeStats statistics={pedigreeData.value.statistics} />

      {/* Tree Visualization */}
      <PedigreeTreeVisualization
        tree={pedigreeData.value.tree}
        onNodeClick={(petId) => navigate(`/pets/${petId}`)}
      />

      {/* Flat Table View (alternative) */}
      <PedigreeTable
        ancestors={pedigreeData.value.flatList}
      />
    </div>
  );
}
```

### Tree Visualization (D3.js)

```typescript
import * as d3 from 'd3';

function PedigreeTreeVisualization({ tree, onNodeClick }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!tree || !svgRef.current) return;

    // Convert to D3 format
    const d3Data = pedigreeStore.formatForD3Tree(tree);

    // Create tree layout
    const treeLayout = d3.tree()
      .size([800, 600])
      .separation((a, b) => a.parent === b.parent ? 1 : 2);

    const root = d3.hierarchy(d3Data);
    const treeData = treeLayout(root);

    // Draw tree
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous

    const g = svg.append('g')
      .attr('transform', 'translate(400, 50)');

    // Links (lines between nodes)
    g.selectAll('.link')
      .data(treeData.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y)
      )
      .style('fill', 'none')
      .style('stroke', '#ccc')
      .style('stroke-width', 2);

    // Nodes
    const node = g.selectAll('.node')
      .data(treeData.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick(d.data.attributes.id));

    // Node circles
    node.append('circle')
      .attr('r', 30)
      .style('fill', d => d.data.attributes.gender === 'male' ? '#4299e1' : '#ed64a6')
      .style('stroke', '#fff')
      .style('stroke-width', 3);

    // Avatar images
    node.append('image')
      .attr('xlink:href', d => d.data.attributes.avatar || '/default-avatar.png')
      .attr('x', -25)
      .attr('y', -25)
      .attr('width', 50)
      .attr('height', 50)
      .attr('clip-path', 'circle(25px at 25px 25px)');

    // Names
    node.append('text')
      .attr('dy', 45)
      .attr('text-anchor', 'middle')
      .text(d => d.data.name)
      .style('font-size', '12px')
      .style('font-weight', 'bold');

  }, [tree, onNodeClick]);

  return (
    <svg ref={svgRef} width="100%" height="600" />
  );
}
```

---

## 🚀 GraphQL Server Options

### Option 1: Hasura (Recommended)

**Pros:**
- ✅ Auto-generates GraphQL from PostgreSQL
- ✅ Zero resolver code
- ✅ Built-in subscriptions
- ✅ Permissions system
- ✅ Performance optimization out-of-box

**Setup:**
```yaml
# docker-compose.yml
services:
  hasura:
    image: hasura/graphql-engine:latest
    ports:
      - "8080:8080"
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://...
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
```

**Generated Schema (auto!):**
```graphql
type Pet {
  id: UUID!
  name: String!
  avatar_url: String
  birth_date: Date
  gender: String
  father_id: UUID
  mother_id: UUID

  # Auto-generated relationships
  father: Pet
  mother: Pet
  children: [Pet!]!
}
```

### Option 2: Custom Apollo Server

**Pros:**
- ✅ Full control over resolvers
- ✅ Custom business logic
- ✅ Complex calculations (inbreeding coefficient)

**Cons:**
- ❌ More code to write
- ❌ Manual schema updates

**Example:**
```typescript
const typeDefs = gql`
  type Pet {
    id: ID!
    name: String!
    avatar_url: String
    father: Pet
    mother: Pet
    ancestors(depth: Int = 7): [Pet!]!
  }

  type Query {
    pet(id: ID!): Pet
    pedigree(petId: ID!, depth: Int = 7): PedigreeTree!
  }
`;

const resolvers = {
  Pet: {
    father: async (parent, args, { db }) => {
      if (!parent.father_id) return null;
      return db.pet.findOne(parent.father_id).exec();
    },
    mother: async (parent, args, { db }) => {
      if (!parent.mother_id) return null;
      return db.pet.findOne(parent.mother_id).exec();
    },
    ancestors: async (parent, { depth }, { db }) => {
      return buildPedigreeRecursive(parent.id, depth, db);
    }
  }
};
```

---

## 📊 Performance Considerations

### Caching Strategy

```typescript
// 1. GraphQL Client Cache (Apollo InMemoryCache)
// - Автоматичний cache для GraphQL responses
// - Нормалізація даних по ID

// 2. RxDB Local Cache
// - Offline-first
// - TTL 24 години (родовід рідко міняється)
// - Автоматичне очищення expired cache

// 3. Memory Signal Cache
// - Reactive signals для UI
// - Очищається при закритті компонента
```

### Query Optimization

```graphql
# ❌ Don't fetch ALL fields for deep trees
query BadPedigree {
  pet(id: "123") {
    id, name, avatar_url, birth_date, gender, breed { ... },
    description, # ← Непотрібне для дерева
    health_records { ... }, # ← Непотрібне

    father {
      # Same heavy fields...
    }
  }
}

# ✅ Fetch only needed fields
query OptimizedPedigree {
  pet(id: "123") {
    id
    name
    avatar_url
    gender

    father {
      id, name, avatar_url, gender
      father { id, name, avatar_url, gender }
    }
  }
}
```

### Lazy Loading Generations

```typescript
// Initial load: тільки 3 покоління
const pedigree = pedigreeStore.getPedigree(petId, { depth: 3 });

// User clicks "Show more"
const deeperPedigree = pedigreeStore.getPedigree(petId, { depth: 7 });
```

---

## 🎯 Implementation Phases

### Phase 1: GraphQL Server Setup (1 тиждень)
- [ ] Deploy Hasura або налаштувати Apollo Server
- [ ] Configure database connection
- [ ] Test basic queries
- [ ] Setup CORS для PWA

### Phase 2: PedigreeStore Implementation (1 тиждень)
- [ ] Create pedigree-store.signal-store.ts
- [ ] GraphQL client integration (Apollo)
- [ ] RxDB cache schema
- [ ] Basic queries (ancestors 7 generations)

### Phase 3: UI Components (1 тиждень)
- [ ] PedigreeTab component
- [ ] PedigreeTreeVisualization (D3.js)
- [ ] PedigreeTable (flat view)
- [ ] PedigreeStats component
- [ ] Loading states & error handling

### Phase 4: Advanced Features (1 тиждень)
- [ ] Descendants tree
- [ ] Common ancestors finder
- [ ] Inbreeding coefficient calculator
- [ ] Export to PDF
- [ ] Print-friendly pedigree certificates

### Phase 5: Testing & Optimization (1 тиждень)
- [ ] Unit tests для PedigreeStore
- [ ] Integration tests для GraphQL queries
- [ ] Performance testing (large pedigrees)
- [ ] Cache invalidation testing
- [ ] Offline mode testing

**Total: 5 тижнів** (може бути швидше з Hasura)

---

## 📚 TypeScript Types

```typescript
interface PedigreeData {
  loading: boolean;
  tree: PedigreeTreeNode | null;
  flatList: PedigreeFlatNode[] | null;
  statistics: PedigreeStatistics | null;
  error: Error | null;
  fromCache?: boolean;
}

interface PedigreeTreeNode {
  id: string;
  name: string;
  avatar_url?: string;
  birth_date?: string;
  gender: 'male' | 'female' | 'unknown';
  breed?: {
    id: string;
    name: string;
  };
  father?: PedigreeTreeNode;
  mother?: PedigreeTreeNode;
  children?: PedigreeTreeNode[];
}

interface PedigreeFlatNode {
  id: string;
  name: string;
  avatar_url?: string;
  birth_date?: string;
  gender: 'male' | 'female' | 'unknown';
  breed?: { id: string; name: string };
  generation: number;  // 1, 2, 3, ..., 7
  path: string[];      // ["father", "father", "mother"]
  relationship: string; // "paternal_grandfather"
}

interface PedigreeStatistics {
  totalAncestors: number;
  uniqueAncestors: number;
  expectedAncestors: number;
  completeness: number;  // Percentage
  maxGeneration: number;
  uniqueBreeds: number;
  inbreedingCoefficient: number;
}

interface CachedPedigree {
  id: string;
  pet_id: string;
  depth: number;
  direction: 'ancestors' | 'descendants' | 'both';
  tree: PedigreeTreeNode;
  flatList: PedigreeFlatNode[];
  statistics: PedigreeStatistics;
  cached_at: string;
  expires_at: string;
}

interface D3TreeNode {
  name: string;
  attributes: {
    id: string;
    avatar?: string;
    birthDate?: string;
    gender?: string;
  };
  children?: D3TreeNode[];
}

interface CommonAncestor extends PedigreeFlatNode {
  commonAncestor: true;
}
```

---

## 🎯 Success Criteria

### Functionality
- ✅ Load 7 generations in <2 seconds (with cache)
- ✅ Load 7 generations in <5 seconds (without cache)
- ✅ Works offline після першого завантаження
- ✅ Accurate statistics (completeness, unique ancestors)
- ✅ Interactive tree visualization
- ✅ Export to PDF

### Performance
- ✅ Single GraphQL query (не 127 REST requests)
- ✅ Efficient cache strategy
- ✅ Smooth UI (no janky scrolling)
- ✅ Memory efficient (cleanup unused trees)

### UX
- ✅ Beautiful tree visualization
- ✅ Collapsible/expandable nodes
- ✅ Zoom & pan support
- ✅ Click node → navigate to pet page
- ✅ Loading skeletons
- ✅ Graceful error handling

---

## 📝 Summary

**Ключові Рішення:**
1. ✅ GraphQL тільки для pedigree (не весь app)
2. ✅ Окремий PedigreeStore (graph logic isolated)
3. ✅ Hasura recommended (auto-schema, zero resolvers)
4. ✅ RxDB cache з TTL 24h (offline-first)
5. ✅ D3.js для візуалізації
6. ✅ Flat list representation для аналізу

**Переваги:**
- Один GraphQL query замість 127 REST
- Offline-first з кешуванням
- Type-safe auto-generated types
- Isolated complexity (не впливає на решту app)
- Готовність до advanced features (inbreeding, linebreeding)

**Next Steps:** Phase 1 - GraphQL Server Setup
