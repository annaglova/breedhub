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

// Test 2: MultiStore
const useMultiStore = createMultiStore('test-multi');

export default function TestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [currentTest, setCurrentTest] = useState('');
  
  // Test SignalStore
  const testSignalStore = () => {
    setCurrentTest('SignalStore');
    const results: string[] = [];
    
    try {
      const store = useTestStore();
      results.push('✅ Store created');
      
      // Test add
      store.addEntity({ id: '1', name: 'Test 1', value: 100 });
      results.push('✅ Added entity');
      
      // Test get
      const entity = store.computed.entities.get('1');
      if (entity?.name === 'Test 1') {
        results.push('✅ Retrieved entity correctly');
      } else {
        results.push('❌ Failed to retrieve entity');
      }
      
      // Test update
      store.updateEntity('1', { value: 200 });
      const updated = store.computed.entities.get('1');
      if (updated?.value === 200) {
        results.push('✅ Updated entity correctly');
      } else {
        results.push('❌ Failed to update entity');
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
      if (store.computed.totalEntities === 0) {
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
      const store = useMultiStore();
      results.push('✅ MultiStore created');
      
      // Test add workspace
      store.addEntity({
        _type: 'workspace',
        id: 'ws1',
        name: 'Test Workspace',
        visibility: 'public',
        permissions: { read: [], write: [], admin: [] },
        settings: {}
      });
      results.push('✅ Added workspace');
      
      // Test add space
      store.addEntity({
        _type: 'space',
        id: 'sp1',
        _parentId: 'ws1',
        name: 'Test Space',
        collection: 'breeds'
      });
      results.push('✅ Added space with parent');
      
      // Test hierarchy
      const children = store.getEntitiesByParent('ws1');
      if (children.length === 1 && children[0].id === 'sp1') {
        results.push('✅ Hierarchy works');
      } else {
        results.push('❌ Hierarchy failed');
      }
      
      // Test validation
      try {
        store.addEntity({
          _type: 'space',
          id: 'sp2',
          name: 'Invalid Space'
          // Missing _parentId - should fail
        });
        results.push('❌ Validation should have failed');
      } catch (e) {
        results.push('✅ Validation works');
      }
      
      // Test cascade delete
      store.removeEntity('ws1', true);
      const remaining = store.getEntity('sp1');
      if (!remaining) {
        results.push('✅ Cascade delete works');
      } else {
        results.push('❌ Cascade delete failed');
      }
      
      // Test export/import
      store.addEntity({
        _type: 'workspace',
        id: 'ws2',
        name: 'Export Test',
        visibility: 'private',
        permissions: { read: [], write: [], admin: [] },
        settings: {}
      });
      
      const exported = store.exportStore();
      if (exported.includes('Export Test')) {
        results.push('✅ Export works');
      } else {
        results.push('❌ Export failed');
      }
      
      store.clearStore();
      store.importStore(exported);
      const imported = store.getEntity('ws2');
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
      const store = useTestStore();
      let updateCount = 0;
      
      // Subscribe to changes
      const unsubscribe = store.subscribe(() => {
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
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
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