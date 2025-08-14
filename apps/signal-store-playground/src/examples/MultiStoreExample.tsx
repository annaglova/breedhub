import React, { useState, useEffect } from 'react';
import { 
  createMultiStore,
  createDefaultWorkspace,
  createDefaultSpace,
  type AnyEntity,
  type EntityType,
  type WorkspaceEntity,
  type SpaceEntity,
  type BreedEntity,
  type PetEntity,
  type ViewEntity,
  type FilterEntity,
  ValidationError
} from '@breedhub/signal-store';
import { 
  Database, 
  FolderTree, 
  Eye, 
  Filter, 
  Plus, 
  Trash2, 
  Edit, 
  Save,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Home,
  Layers,
  Layout,
  Search,
  Dog,
  Cat,
  Building
} from 'lucide-react';

// Create MultiStore instance
const useMultiStore = createMultiStore('playground-multistore');

// Tree node component for hierarchy visualization
function EntityTreeNode({ 
  entity, 
  store, 
  selectedId, 
  onSelect,
  level = 0 
}: {
  entity: AnyEntity;
  store: ReturnType<typeof useMultiStore>;
  selectedId?: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = store.getEntitiesByParent(entity.id);
  
  const getIcon = () => {
    switch (entity._type) {
      case 'workspace': return <Home className="w-4 h-4" />;
      case 'space': return <Layers className="w-4 h-4" />;
      case 'view': return <Layout className="w-4 h-4" />;
      case 'filter': return <Filter className="w-4 h-4" />;
      case 'breed': return <Dog className="w-4 h-4" />;
      case 'pet': return <Cat className="w-4 h-4" />;
      case 'kennel': return <Building className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };
  
  const getColor = () => {
    switch (entity._type) {
      case 'workspace': return 'text-purple-600';
      case 'space': return 'text-blue-600';
      case 'view': return 'text-green-600';
      case 'filter': return 'text-orange-600';
      case 'breed': return 'text-pink-600';
      case 'pet': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };
  
  return (
    <div>
      <div 
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
          selectedId === entity.id ? 'bg-blue-100' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelect(entity.id)}
      >
        {children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
        {children.length === 0 && <div className="w-4" />}
        
        <span className={getColor()}>{getIcon()}</span>
        <span className="text-sm font-medium">{(entity as any).name || entity.id}</span>
        <span className="text-xs text-gray-400">({entity._type})</span>
      </div>
      
      {isExpanded && children.map(child => (
        <EntityTreeNode
          key={child.id}
          entity={child}
          store={store}
          selectedId={selectedId}
          onSelect={onSelect}
          level={level + 1}
        />
      ))}
    </div>
  );
}

export function MultiStoreExample() {
  const store = useMultiStore();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [newEntityType, setNewEntityType] = useState<EntityType>('space');
  const [newEntityName, setNewEntityName] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [storeJson, setStoreJson] = useState('');
  
  // Initialize with default data
  useEffect(() => {
    initializeStore();
  }, []);
  
  const initializeStore = () => {
    try {
      // Create default workspace
      const workspace = {
        ...createDefaultWorkspace(),
        id: 'ws_default',
        name: 'BreedHub Demo'
      };
      store.addEntity(workspace);
      
      // Create spaces
      const spacesData = [
        { id: 'space_breeds', collection: 'breeds', name: 'Breeds', icon: '🐕' },
        { id: 'space_pets', collection: 'pets', name: 'Pets', icon: '🐾' },
        { id: 'space_kennels', collection: 'kennels', name: 'Kennels', icon: '🏠' },
        { id: 'space_contacts', collection: 'contacts', name: 'Contacts', icon: '👥' }
      ];
      
      spacesData.forEach(spaceData => {
        const space = {
          ...createDefaultSpace('ws_default', spaceData.collection as any),
          id: spaceData.id,
          name: spaceData.name,
          icon: spaceData.icon
        };
        store.addEntity(space);
      });
      
      // Create views
      const viewsData = [
        { id: 'view_breeds_grid', parentId: 'space_breeds', name: 'Grid View', viewType: 'grid' },
        { id: 'view_breeds_table', parentId: 'space_breeds', name: 'Table View', viewType: 'table' },
        { id: 'view_pets_list', parentId: 'space_pets', name: 'List View', viewType: 'list' }
      ];
      
      viewsData.forEach(viewData => {
        const view: Partial<ViewEntity> = {
          _type: 'view',
          id: viewData.id,
          _parentId: viewData.parentId,
          name: viewData.name,
          viewType: viewData.viewType as any,
          viewMode: 'fullscreen',
          configuration: {},
          layout: {
            showFilters: true,
            showSearch: true,
            showSort: true,
            showPagination: true,
            showBulkActions: false,
            showExport: true,
            showImport: true
          }
        };
        store.addEntity(view);
      });
      
      // Create sample breeds
      const breeds = [
        { id: 'breed_lab', name: 'Labrador', origin: 'Canada', size: 'large' },
        { id: 'breed_poodle', name: 'Poodle', origin: 'France', size: 'medium' },
        { id: 'breed_bulldog', name: 'Bulldog', origin: 'England', size: 'medium' }
      ];
      
      breeds.forEach(breedData => {
        const breed: Partial<BreedEntity> = {
          _type: 'breed',
          id: breedData.id,
          _parentId: 'space_breeds',
          name: breedData.name,
          origin: breedData.origin,
          size: breedData.size as any,
          description: `${breedData.name} from ${breedData.origin}`,
          temperament: ['Friendly', 'Active'],
          exerciseNeeds: 'moderate',
          groomingNeeds: 'moderate',
          trainability: 'easy',
          barkingLevel: 'moderate',
          lifespan: '10-12 years',
          weight: { min: 20, max: 35 },
          height: { min: 50, max: 60 },
          coat: {
            type: 'short',
            colors: ['Golden', 'Black', 'Brown'],
            hypoallergenic: false
          }
        };
        store.addEntity(breed);
      });
      
      // Create filters
      const filter: Partial<FilterEntity> = {
        _type: 'filter',
        id: 'filter_size',
        _parentId: 'view_breeds_grid',
        name: 'Size Filter',
        field: 'size',
        operator: 'equals',
        value: 'large',
        isActive: true,
        isUserDefined: true
      };
      store.addEntity(filter);
      
    } catch (error) {
      console.error('Failed to initialize store:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Unknown error']);
    }
  };
  
  const selectedEntity = selectedEntityId ? store.getEntity(selectedEntityId) : null;
  const rootEntities = store.getEntitiesByType('workspace');
  
  const handleAddEntity = () => {
    try {
      setValidationErrors([]);
      
      const newEntity: Partial<AnyEntity> = {
        _type: newEntityType,
        name: newEntityName,
        _parentId: selectedEntityId || undefined
      } as any;
      
      // Add type-specific fields
      switch (newEntityType) {
        case 'workspace':
          (newEntity as any).visibility = 'public';
          (newEntity as any).permissions = { read: [], write: [], admin: [] };
          (newEntity as any).settings = {};
          break;
        case 'space':
          (newEntity as any).collection = 'breeds';
          break;
        case 'view':
          (newEntity as any).viewType = 'list';
          (newEntity as any).viewMode = 'fullscreen';
          (newEntity as any).configuration = {};
          (newEntity as any).layout = {
            showFilters: true,
            showSearch: true,
            showSort: true,
            showPagination: true,
            showBulkActions: false,
            showExport: false,
            showImport: false
          };
          break;
        case 'filter':
          (newEntity as any).field = 'name';
          (newEntity as any).operator = 'contains';
          (newEntity as any).value = '';
          (newEntity as any).isActive = true;
          (newEntity as any).isUserDefined = true;
          break;
        case 'breed':
          Object.assign(newEntity, {
            origin: 'Unknown',
            size: 'medium',
            description: '',
            temperament: [],
            exerciseNeeds: 'moderate',
            groomingNeeds: 'moderate',
            trainability: 'moderate',
            barkingLevel: 'moderate',
            lifespan: '10-12 years',
            weight: { min: 10, max: 20 },
            height: { min: 30, max: 40 },
            coat: {
              type: 'short',
              colors: [],
              hypoallergenic: false
            }
          });
          break;
      }
      
      store.addEntity(newEntity);
      setIsAddingEntity(false);
      setNewEntityName('');
      
    } catch (error) {
      if (error instanceof ValidationError) {
        setValidationErrors([`${error.entityType} - ${error.field}: ${error.message}`]);
      } else {
        setValidationErrors([error instanceof Error ? error.message : 'Unknown error']);
      }
    }
  };
  
  const handleDeleteEntity = () => {
    if (selectedEntityId && confirm('Delete this entity and all its children?')) {
      try {
        store.removeEntity(selectedEntityId, true);
        setSelectedEntityId(null);
      } catch (error) {
        setValidationErrors([error instanceof Error ? error.message : 'Unknown error']);
      }
    }
  };
  
  const handleExport = () => {
    const json = store.exportStore();
    setStoreJson(json);
  };
  
  const handleImport = () => {
    try {
      store.importStore(storeJson);
      setValidationErrors([]);
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Unknown error']);
    }
  };
  
  const validateStore = () => {
    const result = store.validateStore();
    if (result.isValid) {
      setValidationErrors(['✅ Store is valid!']);
    } else {
      setValidationErrors([
        ...result.errors.map(e => `❌ ${e.message}`),
        ...result.warnings.map(w => `⚠️ ${w}`)
      ]);
    }
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">MultiStore Architecture Demo</h2>
      
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          {validationErrors.map((error, i) => (
            <div key={i} className="text-sm text-red-600">{error}</div>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Tree View */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Entity Hierarchy</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAddingEntity(true)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Add Entity"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteEntity}
                disabled={!selectedEntityId}
                className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                title="Delete Entity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={validateStore}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="Validate Store"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Tree */}
          <div className="border rounded p-2 max-h-96 overflow-auto">
            {rootEntities.map(entity => (
              <EntityTreeNode
                key={entity.id}
                entity={entity}
                store={store}
                selectedId={selectedEntityId || undefined}
                onSelect={setSelectedEntityId}
              />
            ))}
          </div>
          
          {/* Add Entity Form */}
          {isAddingEntity && (
            <div className="mt-4 p-3 border rounded bg-gray-50">
              <h4 className="font-medium mb-2">Add New Entity</h4>
              <select
                value={newEntityType}
                onChange={(e) => setNewEntityType(e.target.value as EntityType)}
                className="w-full px-2 py-1 border rounded mb-2"
              >
                <option value="workspace">Workspace</option>
                <option value="space">Space</option>
                <option value="view">View</option>
                <option value="filter">Filter</option>
                <option value="breed">Breed</option>
                <option value="pet">Pet</option>
                <option value="kennel">Kennel</option>
                <option value="contact">Contact</option>
              </select>
              <input
                type="text"
                placeholder="Entity name"
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                className="w-full px-2 py-1 border rounded mb-2"
              />
              <div className="text-xs text-gray-600 mb-2">
                Parent: {selectedEntityId || 'None'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddEntity}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddingEntity(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Right: Entity Details */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-bold mb-4">Entity Details</h3>
          
          {selectedEntity ? (
            <div>
              <div className="space-y-2 text-sm">
                <div><strong>ID:</strong> {selectedEntity.id}</div>
                <div><strong>Type:</strong> <span className="px-2 py-1 bg-blue-100 rounded">{selectedEntity._type}</span></div>
                <div><strong>Parent:</strong> {selectedEntity._parentId || 'None'}</div>
                <div><strong>Name:</strong> {(selectedEntity as any).name || 'N/A'}</div>
                
                {/* Metadata */}
                <div className="mt-4">
                  <strong>Metadata:</strong>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedEntity._metadata, null, 2)}
                  </pre>
                </div>
                
                {/* Type-specific fields */}
                <div className="mt-4">
                  <strong>Properties:</strong>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(
                      Object.entries(selectedEntity)
                        .filter(([key]) => !key.startsWith('_') && key !== 'id')
                        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {}),
                      null,
                      2
                    )}
                  </pre>
                </div>
                
                {/* Children */}
                <div className="mt-4">
                  <strong>Children:</strong>
                  <div className="mt-1">
                    {store.getChildren(selectedEntity.id).map(childId => {
                      const child = store.getEntity(childId);
                      return (
                        <div 
                          key={childId} 
                          className="text-xs px-2 py-1 bg-gray-100 rounded mb-1 cursor-pointer hover:bg-gray-200"
                          onClick={() => setSelectedEntityId(childId)}
                        >
                          {(child as any)?.name || childId} ({child?._type})
                        </div>
                      );
                    })}
                    {store.getChildren(selectedEntity.id).length === 0 && (
                      <div className="text-xs text-gray-400">No children</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Select an entity to view details</div>
          )}
        </div>
      </div>
      
      {/* Export/Import */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">Store Export/Import</h3>
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleExport}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm flex items-center gap-1"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm flex items-center gap-1"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
        </div>
        <textarea
          value={storeJson}
          onChange={(e) => setStoreJson(e.target.value)}
          className="w-full h-32 p-2 border rounded font-mono text-xs"
          placeholder="JSON data will appear here after export..."
        />
      </div>
      
      {/* Store Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="p-3 bg-purple-50 rounded">
          <div className="text-2xl font-bold text-purple-600">
            {store.getEntitiesByType('workspace').length}
          </div>
          <div className="text-sm text-gray-600">Workspaces</div>
        </div>
        <div className="p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {store.getEntitiesByType('space').length}
          </div>
          <div className="text-sm text-gray-600">Spaces</div>
        </div>
        <div className="p-3 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-600">
            {store.getEntitiesByType('view').length}
          </div>
          <div className="text-sm text-gray-600">Views</div>
        </div>
        <div className="p-3 bg-pink-50 rounded">
          <div className="text-2xl font-bold text-pink-600">
            {store.findEntities(e => ['breed', 'pet', 'kennel', 'contact'].includes(e._type)).length}
          </div>
          <div className="text-sm text-gray-600">Data Entities</div>
        </div>
      </div>
    </div>
  );
}