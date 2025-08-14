import React, { useState, useEffect } from 'react';
import { 
  createAppStore, 
  createWorkspaceStore,
  createSpaceStore,
  createDataStore,
  createViewStore,
  type Entity 
} from '@breedhub/signal-store';

// Entity types
interface Breed extends Entity {
  id: string;
  name: string;
  origin: string;
  size: 'small' | 'medium' | 'large' | 'giant';
  temperament: string[];
  lifespan: string;
  imageUrl?: string;
}

interface Pet extends Entity {
  id: string;
  name: string;
  breedId: string;
  breedName?: string;
  birthDate: string;
  ownerId?: string;
  kennelId?: string;
  status: 'available' | 'reserved' | 'sold';
}

interface Kennel extends Entity {
  id: string;
  name: string;
  location: string;
  specialties: string[];
  rating: number;
  contactEmail: string;
}

interface Contact extends Entity {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'owner' | 'breeder' | 'vet' | 'other';
  notes?: string;
}

// Mock data
const mockBreeds: Breed[] = [
  { id: '1', name: 'Labrador', origin: 'Canada', size: 'large', temperament: ['Friendly', 'Active'], lifespan: '10-12 years' },
  { id: '2', name: 'Poodle', origin: 'France', size: 'medium', temperament: ['Intelligent', 'Active'], lifespan: '12-15 years' },
  { id: '3', name: 'Bulldog', origin: 'England', size: 'medium', temperament: ['Docile', 'Friendly'], lifespan: '8-10 years' },
  { id: '4', name: 'Beagle', origin: 'England', size: 'small', temperament: ['Friendly', 'Curious'], lifespan: '12-15 years' },
];

const mockPets: Pet[] = [
  { id: '1', name: 'Max', breedId: '1', breedName: 'Labrador', birthDate: '2023-05-15', status: 'available' },
  { id: '2', name: 'Bella', breedId: '2', breedName: 'Poodle', birthDate: '2023-07-20', status: 'reserved' },
  { id: '3', name: 'Charlie', breedId: '3', breedName: 'Bulldog', birthDate: '2023-03-10', status: 'sold' },
  { id: '4', name: 'Luna', breedId: '4', breedName: 'Beagle', birthDate: '2023-09-05', status: 'available' },
];

const mockKennels: Kennel[] = [
  { id: '1', name: 'Happy Paws', location: 'New York', specialties: ['Labrador', 'Golden Retriever'], rating: 4.8, contactEmail: 'info@happypaws.com' },
  { id: '2', name: 'Elite Breeds', location: 'Los Angeles', specialties: ['Poodle', 'Bichon'], rating: 4.9, contactEmail: 'contact@elitebreeds.com' },
];

const mockContacts: Contact[] = [
  { id: '1', name: 'John Smith', email: 'john@example.com', phone: '555-0100', type: 'owner' },
  { id: '2', name: 'Dr. Emily Brown', email: 'emily@vetclinic.com', phone: '555-0200', type: 'vet' },
];

export function HierarchicalStoreExample() {
  // Initialize stores
  const [workspaceType, setWorkspaceType] = useState<'public' | 'private'>('public');
  const [currentSpace, setCurrentSpace] = useState<'breeds' | 'pets' | 'kennels' | 'contacts'>('breeds');
  const [viewType, setViewType] = useState<'list' | 'grid' | 'table' | 'map'>('grid');
  const [viewMode, setViewMode] = useState<'fullscreen' | 'drawer' | 'modal'>('fullscreen');

  // Create stores
  const workspaceStore = React.useMemo(() => createWorkspaceStore('workspace', workspaceType), [workspaceType]);
  const breedsStore = React.useMemo(() => createSpaceStore<Breed>('breeds', 'breeds'), []);
  const petsStore = React.useMemo(() => createSpaceStore<Pet>('pets', 'pets'), []);
  const kennelsStore = React.useMemo(() => createSpaceStore<Kennel>('kennels', 'kennels'), []);
  const contactsStore = React.useMemo(() => createSpaceStore<Contact>('contacts', 'contacts'), []);

  // Hook up stores
  const workspace = workspaceStore();
  const breeds = breedsStore();
  const pets = petsStore();
  const kennels = kennelsStore();
  const contacts = contactsStore();

  // Load initial data
  useEffect(() => {
    breeds.setAllEntities(mockBreeds);
    pets.setAllEntities(mockPets);
    kennels.setAllEntities(mockKennels);
    contacts.setAllEntities(mockContacts);
  }, []);

  // Get current store based on space
  const getCurrentStore = () => {
    switch (currentSpace) {
      case 'breeds': return breeds;
      case 'pets': return pets;
      case 'kennels': return kennels;
      case 'contacts': return contacts;
    }
  };

  const currentStore = getCurrentStore();

  // Handle space navigation
  const handleSpaceChange = (space: typeof currentSpace) => {
    setCurrentSpace(space);
    workspace.navigateToSpace(space);
  };

  // Handle view changes
  const handleViewChange = (type: typeof viewType) => {
    setViewType(type);
    currentStore.setViewType(type);
  };

  // Handle view mode changes
  const handleViewModeChange = (mode: typeof viewMode) => {
    setViewMode(mode);
    currentStore.setViewMode(mode);
  };

  // Handle workspace switch
  const handleWorkspaceSwitch = () => {
    const newType = workspaceType === 'public' ? 'private' : 'public';
    setWorkspaceType(newType);
    workspace.switchWorkspace(newType);
  };

  // Render data based on current view
  const renderData = () => {
    const entities = currentStore.computed.filteredEntities;
    
    if (viewType === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((entity: any) => (
            <div 
              key={entity.id} 
              className={`p-4 border rounded-lg ${
                currentStore.computed.selectedId === entity.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              } hover:shadow-lg transition-shadow cursor-pointer`}
              onClick={() => currentStore.selectEntity(entity.id)}
            >
              <h3 className="font-bold text-lg">{entity.name}</h3>
              {currentSpace === 'breeds' && (
                <>
                  <p className="text-gray-600">Origin: {(entity as Breed).origin}</p>
                  <p className="text-gray-600">Size: {(entity as Breed).size}</p>
                  <p className="text-gray-600">Lifespan: {(entity as Breed).lifespan}</p>
                </>
              )}
              {currentSpace === 'pets' && (
                <>
                  <p className="text-gray-600">Breed: {(entity as Pet).breedName}</p>
                  <p className="text-gray-600">Birth: {(entity as Pet).birthDate}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    (entity as Pet).status === 'available' ? 'bg-green-100 text-green-800' :
                    (entity as Pet).status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {(entity as Pet).status}
                  </span>
                </>
              )}
              {currentSpace === 'kennels' && (
                <>
                  <p className="text-gray-600">Location: {(entity as Kennel).location}</p>
                  <p className="text-gray-600">Rating: ⭐ {(entity as Kennel).rating}</p>
                  <p className="text-gray-600">Email: {(entity as Kennel).contactEmail}</p>
                </>
              )}
              {currentSpace === 'contacts' && (
                <>
                  <p className="text-gray-600">Email: {(entity as Contact).email}</p>
                  <p className="text-gray-600">Phone: {(entity as Contact).phone}</p>
                  <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">
                    {(entity as Contact).type}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (viewType === 'list') {
      return (
        <div className="space-y-2">
          {entities.map((entity: any) => (
            <div 
              key={entity.id} 
              className={`p-3 border rounded ${
                currentStore.computed.selectedId === entity.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              } hover:bg-gray-50 cursor-pointer`}
              onClick={() => currentStore.selectEntity(entity.id)}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{entity.name}</span>
                <span className="text-gray-500 text-sm">
                  {currentSpace === 'breeds' && `${(entity as Breed).origin} • ${(entity as Breed).size}`}
                  {currentSpace === 'pets' && `${(entity as Pet).breedName} • ${(entity as Pet).status}`}
                  {currentSpace === 'kennels' && `${(entity as Kennel).location} • ⭐ ${(entity as Kennel).rating}`}
                  {currentSpace === 'contacts' && `${(entity as Contact).type} • ${(entity as Contact).phone}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (viewType === 'table') {
      return (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Name</th>
              {currentSpace === 'breeds' && (
                <>
                  <th className="border p-2 text-left">Origin</th>
                  <th className="border p-2 text-left">Size</th>
                  <th className="border p-2 text-left">Lifespan</th>
                </>
              )}
              {currentSpace === 'pets' && (
                <>
                  <th className="border p-2 text-left">Breed</th>
                  <th className="border p-2 text-left">Birth Date</th>
                  <th className="border p-2 text-left">Status</th>
                </>
              )}
              {currentSpace === 'kennels' && (
                <>
                  <th className="border p-2 text-left">Location</th>
                  <th className="border p-2 text-left">Rating</th>
                  <th className="border p-2 text-left">Contact</th>
                </>
              )}
              {currentSpace === 'contacts' && (
                <>
                  <th className="border p-2 text-left">Email</th>
                  <th className="border p-2 text-left">Phone</th>
                  <th className="border p-2 text-left">Type</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {entities.map((entity: any) => (
              <tr 
                key={entity.id} 
                className={`${
                  currentStore.computed.selectedId === entity.id ? 'bg-blue-50' : ''
                } hover:bg-gray-50 cursor-pointer`}
                onClick={() => currentStore.selectEntity(entity.id)}
              >
                <td className="border p-2">{entity.name}</td>
                {currentSpace === 'breeds' && (
                  <>
                    <td className="border p-2">{(entity as Breed).origin}</td>
                    <td className="border p-2">{(entity as Breed).size}</td>
                    <td className="border p-2">{(entity as Breed).lifespan}</td>
                  </>
                )}
                {currentSpace === 'pets' && (
                  <>
                    <td className="border p-2">{(entity as Pet).breedName}</td>
                    <td className="border p-2">{(entity as Pet).birthDate}</td>
                    <td className="border p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        (entity as Pet).status === 'available' ? 'bg-green-100 text-green-800' :
                        (entity as Pet).status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(entity as Pet).status}
                      </span>
                    </td>
                  </>
                )}
                {currentSpace === 'kennels' && (
                  <>
                    <td className="border p-2">{(entity as Kennel).location}</td>
                    <td className="border p-2">⭐ {(entity as Kennel).rating}</td>
                    <td className="border p-2">{(entity as Kennel).contactEmail}</td>
                  </>
                )}
                {currentSpace === 'contacts' && (
                  <>
                    <td className="border p-2">{(entity as Contact).email}</td>
                    <td className="border p-2">{(entity as Contact).phone}</td>
                    <td className="border p-2">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {(entity as Contact).type}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return <div>Map view not implemented</div>;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Hierarchical Store Architecture</h2>
      
      {/* Workspace Switcher */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">Workspace Level</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={handleWorkspaceSwitch}
            className={`px-4 py-2 rounded ${
              workspaceType === 'public' 
                ? 'bg-blue-500 text-white' 
                : 'bg-purple-500 text-white'
            }`}
          >
            {workspaceType === 'public' ? '🌍 Public' : '🔒 Private'} Workspace
          </button>
          <span className="text-gray-600">
            Current: {workspace.computed.workspaceName}
          </span>
        </div>
      </div>

      {/* Space Navigation */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">Space Level</h3>
        <div className="flex gap-2">
          {(['breeds', 'pets', 'kennels', 'contacts'] as const).map(space => (
            <button
              key={space}
              onClick={() => handleSpaceChange(space)}
              className={`px-4 py-2 rounded ${
                currentSpace === space 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {space === 'breeds' && '🐕 Breeds'}
              {space === 'pets' && '🐾 Pets'}
              {space === 'kennels' && '🏠 Kennels'}
              {space === 'contacts' && '👥 Contacts'}
            </button>
          ))}
        </div>
      </div>

      {/* View Controls */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">View Level</h3>
        <div className="flex gap-4">
          <div className="flex gap-2">
            <span className="text-gray-600">Type:</span>
            {(['list', 'grid', 'table', 'map'] as const).map(type => (
              <button
                key={type}
                onClick={() => handleViewChange(type)}
                className={`px-3 py-1 rounded text-sm ${
                  viewType === type 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {type === 'list' && '📋'}
                {type === 'grid' && '⚏'}
                {type === 'table' && '📊'}
                {type === 'map' && '🗺️'}
                {' '}{type}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600">Mode:</span>
            {(['fullscreen', 'drawer', 'modal'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === mode 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {mode === 'fullscreen' && '🖥️'}
                {mode === 'drawer' && '📱'}
                {mode === 'modal' && '🗗'}
                {' '}{mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Layer - Search and Filter */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">Data Layer</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 px-3 py-2 border rounded"
            onChange={(e) => currentStore.setSearchQuery(e.target.value)}
          />
          <button
            onClick={() => currentStore.clearFilters()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Filters
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Total: {currentStore.computed.totalEntities} | 
          Filtered: {currentStore.computed.filteredEntities.length} | 
          Selected: {currentStore.computed.selectedIds.size}
        </div>
      </div>

      {/* Data Display */}
      <div className={`${
        viewMode === 'fullscreen' ? '' :
        viewMode === 'drawer' ? 'max-w-md ml-auto border-l pl-4' :
        'max-w-2xl mx-auto border rounded-lg p-4'
      }`}>
        <h3 className="font-bold mb-4">
          {currentSpace.charAt(0).toUpperCase() + currentSpace.slice(1)} 
          ({viewType} view, {viewMode} mode)
        </h3>
        {renderData()}
      </div>

      {/* State Inspector */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">Store State Inspector</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Workspace:</strong>
            <pre className="bg-white p-2 rounded mt-1">
              {JSON.stringify({
                type: workspace.workspaceType,
                name: workspace.computed.workspaceName,
                isPrivate: workspace.computed.isPrivate,
                currentSpace: workspace.currentSpace,
              }, null, 2)}
            </pre>
          </div>
          <div>
            <strong>Current Store:</strong>
            <pre className="bg-white p-2 rounded mt-1">
              {JSON.stringify({
                space: currentSpace,
                view: viewType,
                mode: viewMode,
                totalEntities: currentStore.computed.totalEntities,
                filteredCount: currentStore.computed.filteredEntities.length,
                selectedCount: currentStore.computed.selectedIds.size,
                loading: currentStore.requestStatus === 'loading',
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}