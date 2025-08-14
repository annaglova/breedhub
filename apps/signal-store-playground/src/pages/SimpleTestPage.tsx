import React, { useState, useEffect } from 'react';
import { createSignalStore, withEntities, createMultiStore } from '@breedhub/signal-store';

// Create stores outside component to test them
const useTestStore = createSignalStore('component-test', [withEntities()]);
const useTestMultiStore = createMultiStore('component-multi-test');

export default function SimpleTestPage() {
  const [results, setResults] = useState<string[]>([]);
  const [componentTestResults, setComponentTestResults] = useState<string[]>([]);
  
  // Test stores inside component where hooks work
  const testStore = useTestStore();
  const multiStore = useTestMultiStore();
  
  // Run component tests on mount
  useEffect(() => {
    const testResults: string[] = [];
    
    // Test regular store
    try {
      if (testStore && testStore.addEntity) {
        testResults.push('✅ Store hook works in component');
        
        // Debug: log store structure
        console.log('Store structure:', {
          hasEntities: !!testStore.entities,
          hasComputed: !!testStore.computed,
          storeKeys: Object.keys(testStore).slice(0, 10)
        });
        
        // Test CRUD
        testStore.addEntity({ id: 'test1', name: 'Component Test' });
        
        // Try different ways to access the entity
        let entity = null;
        
        // Method 1: Direct entities Map
        if (testStore.entities instanceof Map) {
          entity = testStore.entities.get('test1');
        }
        
        // Method 2: Computed allEntities
        if (!entity && testStore.computed?.allEntities) {
          const allEntities = testStore.computed.allEntities;
          entity = allEntities.find((e: any) => e.id === 'test1');
        }
        
        // Method 3: Direct state access
        if (!entity && testStore.getState) {
          const state = testStore.getState();
          if (state.entities instanceof Map) {
            entity = state.entities.get('test1');
          }
        }
        
        if (entity && entity.name === 'Component Test') {
          testResults.push('✅ Store CRUD operations work');
        } else {
          testResults.push('❌ Store CRUD operations failed - entity not found');
          console.log('Entity search failed. Store state:', testStore.getState?.());
        }
      } else {
        testResults.push('❌ Store hook failed');
      }
    } catch (error) {
      testResults.push(`❌ Store error: ${error}`);
      console.error('Store test error:', error);
    }
    
    // Test MultiStore
    try {
      if (multiStore && multiStore.addEntity) {
        testResults.push('✅ MultiStore hook works in component');
        
        // Debug: log multistore structure
        console.log('MultiStore structure:', {
          hasEntities: !!multiStore.entities,
          hasComputed: !!multiStore.computed,
          storeKeys: Object.keys(multiStore).slice(0, 10)
        });
        
        // Test adding workspace
        multiStore.addEntity({
          _type: 'workspace',
          id: 'ws-component',
          name: 'Component Test Workspace',
          visibility: 'public',
          permissions: { read: [], write: [], admin: [] },
          settings: {}
        });
        
        // Try different ways to access the workspace
        let workspace = null;
        
        // Method 1: Direct entities Map
        if (multiStore.entities instanceof Map) {
          workspace = multiStore.entities.get('ws-component');
        }
        
        // Method 2: Computed allEntities
        if (!workspace && multiStore.computed?.allEntities) {
          const allEntities = multiStore.computed.allEntities;
          workspace = allEntities.find((e: any) => e.id === 'ws-component');
        }
        
        // Method 3: Direct state access
        if (!workspace && multiStore.getState) {
          const state = multiStore.getState();
          if (state.entities instanceof Map) {
            workspace = state.entities.get('ws-component');
          }
        }
        
        if (workspace && workspace.name === 'Component Test Workspace') {
          testResults.push('✅ MultiStore CRUD operations work');
        } else {
          testResults.push('❌ MultiStore CRUD failed - workspace not found');
          console.log('Workspace search failed. MultiStore state:', multiStore.getState?.());
        }
      } else {
        testResults.push('❌ MultiStore hook failed');
      }
    } catch (error) {
      testResults.push(`❌ MultiStore error: ${error}`);
      console.error('MultiStore test error:', error);
    }
    
    setComponentTestResults(testResults);
  }, []);
  
  // Test 1: Basic JavaScript
  const testBasic = () => {
    const testResults: string[] = [];
    
    // Test 1
    const arr = [1, 2, 3];
    if (arr.length === 3) {
      testResults.push('✅ Array works');
    } else {
      testResults.push('❌ Array failed');
    }
    
    // Test 2
    const obj = { name: 'test' };
    if (obj.name === 'test') {
      testResults.push('✅ Object works');
    } else {
      testResults.push('❌ Object failed');
    }
    
    setResults(testResults);
  };
  
  // Test 2: Try to import and use store
  const testStoreImport = async () => {
    const testResults: string[] = [];
    
    try {
      // Dynamic import to catch errors
      const { createSignalStore, withEntities } = await import('@breedhub/signal-store');
      testResults.push('✅ Import successful');
      
      // Try to create store (this creates a hook, not a store instance)
      const useStore = createSignalStore('simple-test', [withEntities()]);
      testResults.push('✅ Store creation successful');
      
      // We can't call the hook here since we're not in a component
      // Instead, let's test the store methods directly
      testResults.push('✅ Store hook created (can\'t test in non-component context)');
      
      // Test that the store hook exists and is a function
      if (typeof useStore === 'function') {
        testResults.push('✅ Store hook is a valid function');
      } else {
        testResults.push('❌ Store hook is not a function');
      }
      
    } catch (error) {
      testResults.push(`❌ Error: ${error}`);
      console.error('Test error:', error);
    }
    
    setResults(testResults);
  };
  
  // Test 3: Check MultiStore
  const testMultiStoreImport = async () => {
    const testResults: string[] = [];
    
    try {
      // Try to import MultiStore
      const signalStore = await import('@breedhub/signal-store');
      
      if (signalStore.createMultiStore) {
        testResults.push('✅ MultiStore export found');
        
        // Try to create the hook
        const useMultiStore = signalStore.createMultiStore('test-multi');
        testResults.push('✅ MultiStore hook created');
        
        // Check that it's a function (we can't call it outside component)
        if (typeof useMultiStore === 'function') {
          testResults.push('✅ MultiStore hook is a valid function');
          
          // We can't actually use the hook here, but we've verified:
          // 1. The export exists
          // 2. The createMultiStore function works
          // 3. It returns a hook function
          testResults.push('✅ MultiStore ready for use in components');
        } else {
          testResults.push('❌ MultiStore hook is not a function');
        }
      } else {
        testResults.push('❌ MultiStore not exported');
        testResults.push('Available exports: ' + Object.keys(signalStore).slice(0, 5).join(', '));
      }
      
    } catch (error) {
      testResults.push(`❌ MultiStore Error: ${error}`);
      console.error('MultiStore test error:', error);
    }
    
    setResults(testResults);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Test Page</h1>
      
      <div className="mb-4 space-x-2">
        <button 
          onClick={testBasic}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Test Basic JS
        </button>
        
        <button 
          onClick={testStoreImport}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test SignalStore
        </button>
        
        <button 
          onClick={testMultiStoreImport}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Test MultiStore
        </button>
      </div>
      
      <div className="bg-white border rounded p-4">
        <h2 className="font-bold mb-2">Button Test Results:</h2>
        {results.length === 0 ? (
          <p className="text-gray-500">Click a button to run tests</p>
        ) : (
          <div className="space-y-1">
            {results.map((result, i) => (
              <div 
                key={i} 
                className={result.startsWith('✅') ? 'text-green-600' : 'text-red-600'}
              >
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {componentTestResults.length > 0 && (
        <div className="bg-green-50 border border-green-300 rounded p-4 mt-4">
          <h2 className="font-bold mb-2">Component Hook Tests (Auto-run):</h2>
          <div className="space-y-1">
            {componentTestResults.map((result, i) => (
              <div 
                key={i} 
                className={result.startsWith('✅') ? 'text-green-600' : 'text-red-600'}
              >
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-300 rounded">
        <h3 className="font-bold mb-2">Debugging Info:</h3>
        <p className="text-sm">Open browser console (F12) to see detailed errors</p>
        <p className="text-sm mt-2">This page tests:</p>
        <ul className="list-disc list-inside text-sm">
          <li>Basic JavaScript (sanity check)</li>
          <li>SignalStore import and usage</li>
          <li>MultiStore availability and functionality</li>
        </ul>
      </div>
    </div>
  );
}