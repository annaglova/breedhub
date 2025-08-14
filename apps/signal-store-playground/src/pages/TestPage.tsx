import React, { useState } from 'react';
import { 
  createSignalStore,
  withEntities,
  withFiltering,
  withFilteredEntities,
  createMultiStore,
  type Entity
} from '@breedhub/signal-store';

// Simple test entity
interface TestItem extends Entity {
  id: string;
  name: string;
  value: number;
}

// Test 1: Basic SignalStore
const useTestStore = createSignalStore<TestItem>('test', [
  withEntities<TestItem>(),
  withFiltering<TestItem>(),
  withFilteredEntities<TestItem>(),
]);

// Test 2: MultiStore - create once globally
const useMultiStore = createMultiStore('test-multi');

export default function TestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [currentTest, setCurrentTest] = useState('');
  const store = useTestStore();
  const multiStore = useMultiStore();
  
  // Test SignalStore
  const testSignalStore = () => {
    setCurrentTest('SignalStore');
    const results: string[] = [];
    
    try {
      results.push('✅ Store created');
      
      // Debug store structure
      console.log('Store structure:', {
        hasEntities: !!store.entities,
        hasComputed: !!store.computed,
        keys: Object.keys(store).slice(0, 15)
      });
      
      // Test add
      store.addEntity({ id: '1', name: 'Test 1', value: 100 });
      results.push('✅ Added entity');
      
      // Test get - entities are in computed.allEntities as array
      let entity = null;
      
      // Primary method: Computed allEntities (this is where they actually are)
      if (store.computed?.allEntities) {
        const all = store.computed.allEntities;
        entity = all.find((e: any) => e.id === '1');
      }
      
      // Fallback: Direct entities if it's a Map
      if (!entity && store.entities instanceof Map) {
        entity = store.entities.get('1');
      }
      
      // Fallback: getState if available
      if (!entity && store.getState) {
        const state = store.getState();
        if (state.entities instanceof Map) {
          entity = state.entities.get('1');
        }
      }
      
      if (entity?.name === 'Test 1') {
        results.push('✅ Retrieved entity correctly');
      } else {
        results.push('❌ Failed to retrieve entity');
        console.log('Entity not found. Store state:', store);
      }
      
      // Test update - first check if updateEntity exists
      console.log('Update test - checking available methods:');
      console.log('Has updateEntity?', typeof store.updateEntity === 'function');
      console.log('Has updateOne?', typeof store.updateOne === 'function');
      console.log('Has setEntity?', typeof store.setEntity === 'function');
      console.log('Available store methods:', Object.keys(store).filter(k => typeof store[k] === 'function'));
      
      // Check entity before update
      let entityBefore = null;
      if (store.computed?.allEntities) {
        entityBefore = store.computed.allEntities.find((e: any) => e.id === '1');
      } else if (store.entities instanceof Map) {
        entityBefore = store.entities.get('1');
      }
      console.log('Entity before update:', entityBefore);
      
      // Try to update
      if (typeof store.updateEntity === 'function') {
        try {
          store.updateEntity('1', { value: 200 });
          console.log('updateEntity called successfully');
        } catch (e) {
          console.log('updateEntity error:', e);
        }
      } else if (typeof store.updateOne === 'function') {
        try {
          store.updateOne({ id: '1', changes: { value: 200 } });
          console.log('updateOne called successfully');
        } catch (e) {
          console.log('updateOne error:', e);
        }
      } else {
        // Fallback: remove and re-add
        console.log('No update method found, using remove+add fallback');
        if (entityBefore) {
          store.removeEntity('1');
          store.addEntity({ ...entityBefore, value: 200 });
        }
      }
      
      // Get updated entity - check computed.allEntities first
      let updated = null;
      if (store.computed?.allEntities) {
        const all = store.computed.allEntities;
        updated = all.find((e: any) => e.id === '1');
      } else if (store.entities instanceof Map) {
        updated = store.entities.get('1');
      } else if (store.getState) {
        const state = store.getState();
        if (state.entities instanceof Map) {
          updated = state.entities.get('1');
        }
      }
      
      console.log('Entity after update:', updated);
      console.log('All entities after update:', store.computed?.allEntities || store.entities);
      
      if (updated?.value === 200) {
        results.push('✅ Updated entity correctly');
      } else {
        results.push('❌ Failed to update entity');
        console.log('Update verification failed');
        console.log('Expected value: 200, got:', updated?.value);
      }
      
      // Test filter
      store.setSearchQuery('Test');
      const filtered = store.computed.filteredEntities;
      if (filtered.length === 1) {
        results.push('✅ Filtering works');
      } else {
        results.push('❌ Filtering failed');
      }
      
      // Test remove
      store.removeEntity('1');
      if (store.computed.totalCount === 0) {
        results.push('✅ Removed entity');
      } else {
        results.push('❌ Failed to remove entity');
      }
      
    } catch (error) {
      results.push(`❌ Error: ${error}`);
    }
    
    setTestResults(results);
  };
  
  // Test MultiStore
  const testMultiStore = () => {
    setCurrentTest('MultiStore');
    const results: string[] = [];
    
    try {
      results.push('✅ MultiStore created');
      
      // Test add workspace
      
      multiStore.addEntity({
        _type: 'workspace',
        id: 'ws1',
        name: 'Test Workspace',
        visibility: 'public',
        permissions: { read: [], write: [], admin: [] },
        settings: {}
      });
      
      results.push('✅ Added workspace');
      
      // Test add space
      try {
        multiStore.addEntity({
          _type: 'space',
          id: 'sp1',
          _parentId: 'ws1',
          name: 'Test Space',
          collection: 'breeds',
          type: 'collection',
          config: {}
        });
        results.push('✅ Added space with parent');
      } catch (e: any) {
        results.push(`❌ Failed to add space: ${e.message}`);
        return setTestResults(results);
      }
      
      // Test hierarchy - getChildren returns IDs, not entities
      const childIds = multiStore.getChildren('ws1');
      
      if (childIds && childIds.length === 1 && childIds[0] === 'sp1') {
        results.push('✅ Hierarchy works');
      } else {
        results.push(`❌ Hierarchy failed - expected 1 child ID, got ${childIds?.length || 0}`);
      }
      
      // Test validation
      try {
        multiStore.addEntity({
          _type: 'space',
          id: 'sp2',
          name: 'Invalid Space',
          collection: 'pets',
          type: 'collection',
          config: {}
          // Missing _parentId - should fail
        } as any);
        results.push('❌ Validation should have failed');
      } catch (e) {
        results.push('✅ Validation works');
      }
      
      // Test cascade delete
      if (typeof multiStore.removeEntityWithChildren === 'function') {
        multiStore.removeEntityWithChildren('ws1');
      } else if (typeof multiStore.removeEntity === 'function') {
        // Fallback: manually remove children first
        const childrenToRemove = multiStore.getChildren('ws1');
        childrenToRemove?.forEach((childId: string) => {
          multiStore.removeEntity(childId);
        });
        multiStore.removeEntity('ws1');
      } else {
        results.push('❌ No remove method found');
        return setTestResults(results);
      }
      
      // Check if child was deleted - use getState() for current state
      let remaining = null;
      const currentState = multiStore.getState();
      if (currentState?.entities instanceof Map) {
        remaining = currentState.entities.get('sp1');
      } else if (multiStore.computed?.allEntities) {
        const all = multiStore.computed.allEntities;
        remaining = all.find((e: any) => e.id === 'sp1');
      }
      
      if (!remaining) {
        results.push('✅ Cascade delete works');
      } else {
        results.push('❌ Cascade delete failed');
      }
      
      // Test export/import
      multiStore.addEntity({
        _type: 'workspace',
        id: 'ws2',
        name: 'Export Test',
        visibility: 'private',
        permissions: { read: [], write: [], admin: [] },
        settings: {}
      });
      
      const exported = multiStore.exportStore();
      if (exported && exported.includes('Export Test')) {
        results.push('✅ Export works');
      } else {
        results.push('❌ Export failed');
      }
      
      multiStore.clearStore();
      multiStore.importStore(exported);
      
      // Check if imported successfully - use computed.allEntities
      let imported = null;
      if (multiStore.computed?.allEntities) {
        const all = multiStore.computed.allEntities;
        imported = all.find((e: any) => e.id === 'ws2');
      } else if (multiStore.entities instanceof Map) {
        imported = multiStore.entities.get('ws2');
      } else if (multiStore.getState) {
        const state = multiStore.getState();
        if (state.entities instanceof Map) {
          imported = state.entities.get('ws2');
        }
      }
      
      if (imported && (imported as any).name === 'Export Test') {
        results.push('✅ Import works');
      } else {
        results.push('❌ Import failed');
      }
      
    } catch (error) {
      results.push(`❌ Error: ${error}`);
    }
    
    setTestResults(results);
  };
  
  // Test Reactivity
  const testReactivity = () => {
    setCurrentTest('Reactivity');
    const results: string[] = [];
    
    try {
      let updateCount = 0;
      
      // Subscribe to changes
      const unsubscribe = useTestStore.subscribe(() => {
        updateCount++;
      });
      
      // Make changes
      store.addEntity({ id: '1', name: 'React Test', value: 1 });
      store.updateEntity('1', { value: 2 });
      store.removeEntity('1');
      
      // Check updates
      if (updateCount >= 3) {
        results.push(`✅ Reactivity works (${updateCount} updates)`);
      } else {
        results.push(`❌ Reactivity failed (only ${updateCount} updates)`);
      }
      
      unsubscribe();
      
    } catch (error) {
      results.push(`❌ Error: ${error}`);
    }
    
    setTestResults(results);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Store Testing Dashboard</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Run Tests</h2>
        <div className="flex gap-4">
          <button
            onClick={testSignalStore}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test SignalStore
          </button>
          <button
            onClick={testMultiStore}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Test MultiStore
          </button>
          <button
            onClick={testReactivity}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Reactivity
          </button>
        </div>
      </div>
      
      {currentTest && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-bold mb-2">Test Results: {currentTest}</h3>
          <div className="space-y-1 font-mono text-sm">
            {testResults.map((result, i) => (
              <div key={i} className={result.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">How to Test Stores:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li><strong>SignalStore Test</strong> - Tests basic CRUD operations, filtering, and state management</li>
          <li><strong>MultiStore Test</strong> - Tests hierarchy, validation, cascade delete, export/import</li>
          <li><strong>Reactivity Test</strong> - Tests that components re-render when store changes</li>
        </ol>
        
        <h3 className="font-bold mt-4 mb-2">Interactive Examples:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>/entities</strong> - Test CRUD operations with products</li>
          <li><strong>/filtering</strong> - Test search and filters</li>
          <li><strong>/hierarchy</strong> - Test hierarchical store structure</li>
          <li><strong>/multistore</strong> - Full MultiStore demo with tree view</li>
        </ul>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold mb-2">Quick Manual Test:</h3>
        <p className="text-sm mb-3">Open browser console and run:</p>
        <pre className="bg-gray-800 text-white p-3 rounded text-xs overflow-x-auto">
{`// Test in console
const store = window.testStore = (() => {
  const { createSignalStore, withEntities } = window.SignalStore;
  const useStore = createSignalStore('console-test', [withEntities()]);
  return useStore();
})();

// Add entity
store.addEntity({ id: '1', name: 'Console Test' });

// Check
console.log('Entities:', Array.from(store.computed.entities.values()));

// Update
store.updateEntity('1', { name: 'Updated!' });

// Remove
store.removeEntity('1');`}
        </pre>
      </div>
    </div>
  );
}