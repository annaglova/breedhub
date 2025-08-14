import React, { useState } from 'react';

export default function SimpleTestPage() {
  const [results, setResults] = useState<string[]>([]);
  
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
  const testStore = async () => {
    const testResults: string[] = [];
    
    try {
      // Dynamic import to catch errors
      const { createSignalStore, withEntities } = await import('@breedhub/signal-store');
      testResults.push('✅ Import successful');
      
      // Try to create store
      const useStore = createSignalStore('simple-test', [withEntities()]);
      testResults.push('✅ Store creation successful');
      
      // Try to use store
      const store = useStore();
      testResults.push('✅ Store hook works');
      
      // Try CRUD
      store.addEntity({ id: '1', name: 'Test' });
      const entity = store.computed.entities.get('1');
      
      if (entity && entity.name === 'Test') {
        testResults.push('✅ CRUD operations work');
      } else {
        testResults.push('❌ CRUD operations failed');
      }
      
    } catch (error) {
      testResults.push(`❌ Error: ${error}`);
      console.error('Test error:', error);
    }
    
    setResults(testResults);
  };
  
  // Test 3: Check MultiStore
  const testMultiStore = async () => {
    const testResults: string[] = [];
    
    try {
      // Try to import MultiStore
      const signalStore = await import('@breedhub/signal-store');
      
      if (signalStore.createMultiStore) {
        testResults.push('✅ MultiStore export found');
        
        // Try to create
        const useMultiStore = signalStore.createMultiStore('test-multi');
        const store = useMultiStore();
        
        if (store && store.addEntity) {
          testResults.push('✅ MultiStore instance created');
          
          // Try to add entity
          store.addEntity({
            _type: 'workspace',
            id: 'ws1',
            name: 'Test',
            visibility: 'public',
            permissions: { read: [], write: [], admin: [] },
            settings: {}
          });
          
          testResults.push('✅ MultiStore add entity works');
        } else {
          testResults.push('❌ MultiStore instance failed');
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
          onClick={testStore}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test SignalStore
        </button>
        
        <button 
          onClick={testMultiStore}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Test MultiStore
        </button>
      </div>
      
      <div className="bg-white border rounded p-4">
        <h2 className="font-bold mb-2">Results:</h2>
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