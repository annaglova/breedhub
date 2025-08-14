import React, { useState, useEffect } from 'react';
import { createMultiStore } from '@breedhub/signal-store';
import type { WorkspaceEntity, SpaceEntity, BreedEntity, PetEntity } from '@breedhub/signal-store';

// Create test multistore
const useTestMultiStore = createMultiStore('advanced-test');

export default function AdvancedTestPage() {
  const [testResults, setTestResults] = useState<Record<string, string[]>>({});
  const multiStore = useTestMultiStore();
  
  // Test 1: Parent-Child Relationships
  const testHierarchy = () => {
    const results: string[] = [];
    
    try {
      // Create workspace
      const workspaceId = 'ws-test-' + Date.now();
      multiStore.addEntity({
        _type: 'workspace',
        id: workspaceId,
        name: 'Test Workspace',
        visibility: 'private',
        permissions: { read: [], write: [], admin: ['user1'] },
        settings: {}
      } as WorkspaceEntity);
      results.push('✅ Workspace created');
      
      // Create space under workspace
      const spaceId = 'space-test-' + Date.now();
      multiStore.addEntity({
        _type: 'space',
        id: spaceId,
        _parentId: workspaceId,
        name: 'Dogs Collection',
        collection: 'breeds',
        type: 'collection',
        config: {}
      } as SpaceEntity);
      results.push('✅ Space created with parent');
      
      // Try to create space without parent (should fail)
      try {
        multiStore.addEntity({
          _type: 'space',
          id: 'orphan-space',
          name: 'Orphan Space',
          collection: 'breeds',
          type: 'collection',
          config: {}
        } as SpaceEntity);
        results.push('❌ Orphan space created (should have failed)');
      } catch (e: any) {
        results.push('✅ Orphan space rejected: ' + e.message);
      }
      
      // Create breed under space
      const breedId = 'breed-test-' + Date.now();
      multiStore.addEntity({
        _type: 'breed',
        id: breedId,
        _parentId: spaceId,
        name: 'German Shepherd',
        species: 'dog',
        origin: 'Germany',
        size: 'large',
        exerciseNeeds: 'high',
        characteristics: {}
      } as BreedEntity);
      results.push('✅ Breed created under space');
      
      // Test getChildren (returns IDs, not entities)
      const spaceChildren = multiStore.getChildren(spaceId);
      if (spaceChildren.length === 1 && spaceChildren[0] === breedId) {
        results.push('✅ getChildren works');
      } else {
        results.push('❌ getChildren failed');
      }
      
      // Test getDescendants
      const workspaceDescendants = multiStore.getDescendants(workspaceId);
      if (workspaceDescendants.length === 2) {
        results.push('✅ getDescendants works');
      } else {
        results.push(`❌ getDescendants failed: expected 2, got ${workspaceDescendants.length}`);
      }
      
    } catch (error: any) {
      results.push(`❌ Error: ${error.message}`);
    }
    
    setTestResults(prev => ({ ...prev, hierarchy: results }));
  };
  
  // Test 2: Validation
  const testValidation = () => {
    const results: string[] = [];
    
    try {
      // Test invalid entity type
      try {
        multiStore.addEntity({
          _type: 'invalid_type' as any,
          id: 'invalid1',
          name: 'Invalid'
        } as any);
        results.push('❌ Invalid type accepted');
      } catch (e: any) {
        results.push('✅ Invalid type rejected');
      }
      
      // Test workspace without required fields
      try {
        multiStore.addEntity({
          _type: 'workspace',
          id: 'invalid-ws',
          name: 'Missing Fields'
          // Missing: visibility, permissions, settings
        } as any);
        results.push('❌ Invalid workspace accepted');
      } catch (e: any) {
        results.push('✅ Invalid workspace rejected');
      }
      
      // Test invalid parent-child relationship
      const ws = 'ws-val-' + Date.now();
      multiStore.addEntity({
        _type: 'workspace',
        id: ws,
        name: 'Validation Test',
        visibility: 'public',
        permissions: { read: [], write: [], admin: [] },
        settings: {}
      } as WorkspaceEntity);
      
      try {
        // Try to add breed directly under workspace (invalid)
        multiStore.addEntity({
          _type: 'breed',
          id: 'invalid-breed',
          _parentId: ws, // Wrong: breed can't be under workspace
          name: 'Invalid Breed',
          species: 'dog',
          origin: 'Unknown',
          size: 'medium',
          exerciseNeeds: 'moderate',
          characteristics: {}
        } as BreedEntity);
        results.push('❌ Invalid parent-child accepted');
      } catch (e: any) {
        results.push('✅ Invalid parent-child rejected');
      }
      
    } catch (error: any) {
      results.push(`❌ Error: ${error.message}`);
    }
    
    setTestResults(prev => ({ ...prev, validation: results }));
  };
  
  // Test 3: Filtering and Sorting
  const testFiltering = () => {
    const results: string[] = [];
    
    try {
      // Add test data
      const ws = 'ws-filter-' + Date.now();
      multiStore.addEntity({
        _type: 'workspace',
        id: ws,
        name: 'Filter Test',
        visibility: 'public',
        permissions: { read: [], write: [], admin: [] },
        settings: {}
      } as WorkspaceEntity);
      
      const space = 'space-filter-' + Date.now();
      multiStore.addEntity({
        _type: 'space',
        id: space,
        _parentId: ws,
        name: 'Pets',
        collection: 'pets',
        type: 'collection',
        config: {}
      } as SpaceEntity);
      
      // First create a breed to reference
      const breedId = 'breed-filter-' + Date.now();
      multiStore.addEntity({
        _type: 'breed',
        id: breedId,
        _parentId: space,
        name: 'Labrador',
        species: 'dog',
        origin: 'Canada',
        size: 'large',
        exerciseNeeds: 'high',
        characteristics: {}
      } as BreedEntity);
      
      // Add multiple pets
      const petIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const petId = `pet-${i}-${Date.now()}`;
        petIds.push(petId);
        multiStore.addEntity({
          _type: 'pet',
          id: petId,
          _parentId: space,
          name: `Pet ${i}`,
          breedId: breedId,  // Add breedId reference
          birthDate: new Date(2020 + i, 0, 1),
          gender: i % 2 === 0 ? 'male' : 'female',
          status: 'available',  // Add required status field
          color: i % 2 === 0 ? 'brown' : 'white',  // Add required color field
          healthStatus: i % 2 === 0 ? 'excellent' : 'good',  // Add required healthStatus field with variety
          healthRecords: []
        } as PetEntity);
      }
      results.push(`✅ Added ${petIds.length} test pets`);
      
      // Test type filtering
      multiStore.setFilter({
        field: '_type',
        value: 'pet',
        operator: 'equals',
        active: true
      });
      const petEntities = multiStore.computed.filteredEntities;
      if (petEntities.length === 5) {
        results.push('✅ Type filtering works');
      } else {
        results.push(`❌ Type filtering failed: expected 5, got ${petEntities.length}`);
      }
      
      // Test compound filtering
      multiStore.setFilter({
        field: 'gender',
        value: 'male',
        operator: 'equals',
        active: true
      });
      const maleEntities = multiStore.computed.filteredEntities;
      if (maleEntities.length === 3) {
        results.push('✅ Compound filtering works');
      } else {
        results.push(`❌ Compound filtering failed: expected 3 males, got ${maleEntities.length}`);
      }
      
      // Clear filters
      multiStore.clearFilters();
      const allAfterClear = multiStore.computed.filteredEntities;
      if (allAfterClear.length > 5) {
        results.push('✅ Clear filters works');
      } else {
        results.push('❌ Clear filters failed');
      }
      
    } catch (error: any) {
      results.push(`❌ Error: ${error.message}`);
    }
    
    setTestResults(prev => ({ ...prev, filtering: results }));
  };
  
  // Test 4: Export/Import
  const testExportImport = () => {
    const results: string[] = [];
    
    try {
      // Create test data
      const ws = 'ws-export-' + Date.now();
      multiStore.addEntity({
        _type: 'workspace',
        id: ws,
        name: 'Export Test',
        visibility: 'public',
        permissions: { read: [], write: [], admin: [] },
        settings: {}
      } as WorkspaceEntity);
      
      const space = 'space-export-' + Date.now();
      multiStore.addEntity({
        _type: 'space',
        id: space,
        _parentId: ws,
        name: 'Export Space',
        collection: 'breeds',
        type: 'collection',
        config: {}
      } as SpaceEntity);
      
      // Export data
      const exported = multiStore.exportStore();
      const exportedData = JSON.parse(exported);
      if (exportedData.entities && exportedData.entities.length > 0) {
        results.push(`✅ Export successful: ${exportedData.entities.length} entities`);
      } else {
        results.push('❌ Export failed');
      }
      
      // Get current count
      const countBefore = multiStore.computed.totalCount;
      
      // Clear store
      multiStore.clearStore();
      if (multiStore.computed.totalCount === 0) {
        results.push('✅ Clear all works');
      } else {
        results.push('❌ Clear all failed');
      }
      
      // Import data back
      try {
        multiStore.importStore(exported);
        results.push(`✅ Import successful`);
      } catch (error: any) {
        results.push(`❌ Import failed: ${error.message}`);
      }
      
      // Verify data restored
      const countAfter = multiStore.computed.totalCount;
      if (countAfter === countBefore) {
        results.push('✅ Data fully restored');
      } else {
        results.push(`❌ Data mismatch: ${countBefore} -> ${countAfter}`);
      }
      
    } catch (error: any) {
      results.push(`❌ Error: ${error.message}`);
    }
    
    setTestResults(prev => ({ ...prev, exportImport: results }));
  };
  
  // Test 5: Performance with many entities
  const testPerformance = () => {
    const results: string[] = [];
    
    try {
      // Clear store first to get clean results
      multiStore.clearStore();
      
      const startTime = performance.now();
      
      // Create workspace
      const ws = 'ws-perf-' + Date.now();
      multiStore.addEntity({
        _type: 'workspace',
        id: ws,
        name: 'Performance Test',
        visibility: 'public',
        permissions: { read: [], write: [], admin: [] },
        settings: {}
      } as WorkspaceEntity);
      
      // Create multiple spaces
      const spaceIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const spaceId = `space-perf-${i}-${Date.now()}`;
        spaceIds.push(spaceId);
        multiStore.addEntity({
          _type: 'space',
          id: spaceId,
          _parentId: ws,
          name: `Space ${i}`,
          collection: i % 2 === 0 ? 'breeds' : 'pets',
          type: 'collection',
          config: {}
        } as SpaceEntity);
      }
      
      // Create a breed for performance test
      const perfBreedId = 'breed-perf-' + Date.now();
      multiStore.addEntity({
        _type: 'breed',
        id: perfBreedId,
        _parentId: spaceIds[0],
        name: 'Mixed Breed',
        species: 'dog',
        origin: 'Various',
        size: 'medium',
        exerciseNeeds: 'moderate',
        characteristics: {}
      } as BreedEntity);
      
      // Add 100 pets across spaces
      for (let i = 0; i < 100; i++) {
        const spaceId = spaceIds[i % spaceIds.length];
        multiStore.addEntity({
          _type: 'pet',
          id: `pet-perf-${i}-${Date.now()}`,
          _parentId: spaceId,
          name: `Pet ${i}`,
          breedId: perfBreedId,  // Add breedId reference
          birthDate: new Date(),
          gender: i % 2 === 0 ? 'male' : 'female',
          status: i % 4 === 0 ? 'available' : i % 4 === 1 ? 'reserved' : i % 4 === 2 ? 'sold' : 'retired',  // Add required status field with variety
          color: ['black', 'white', 'brown', 'grey'][i % 4],  // Add required color field
          healthStatus: i % 3 === 0 ? 'excellent' : i % 3 === 1 ? 'good' : 'fair',  // Add required healthStatus field with variety
          healthRecords: []
        } as PetEntity);
      }
      
      const addTime = performance.now() - startTime;
      results.push(`✅ Added 112 entities in ${addTime.toFixed(2)}ms`);
      
      // Test query performance
      const queryStart = performance.now();
      const allPets = multiStore.getEntitiesByType('pet');
      const queryTime = performance.now() - queryStart;
      
      // Check if we got the right number of pets
      const expectedPets = 100;
      if (allPets.length === expectedPets) {
        results.push(`✅ Query ${expectedPets} pets in ${queryTime.toFixed(2)}ms`);
      } else {
        results.push(`❌ Query failed: expected ${expectedPets}, got ${allPets.length}`);
      }
      
      // Test hierarchy traversal
      const traversalStart = performance.now();
      const descendants = multiStore.getDescendants(ws);
      const traversalTime = performance.now() - traversalStart;
      
      // Descendants should be: 10 spaces + 1 breed + 100 pets = 111
      const expectedDescendants = 111;
      if (descendants.length === expectedDescendants) {
        results.push(`✅ Traverse ${expectedDescendants} descendants in ${traversalTime.toFixed(2)}ms`);
      } else {
        results.push(`❌ Traversal failed: expected ${expectedDescendants}, got ${descendants.length}`);
      }
      
      // Performance assessment
      if (addTime < 100 && queryTime < 10 && traversalTime < 10) {
        results.push('✅ Excellent performance');
      } else if (addTime < 500 && queryTime < 50 && traversalTime < 50) {
        results.push('⚠️ Acceptable performance');
      } else {
        results.push('❌ Performance needs optimization');
      }
      
    } catch (error: any) {
      results.push(`❌ Error: ${error.message}`);
    }
    
    setTestResults(prev => ({ ...prev, performance: results }));
  };
  
  // Run all tests on mount
  useEffect(() => {
    // Auto-run basic hierarchy test to show it's working
    testHierarchy();
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Advanced MultiStore Tests</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          onClick={testHierarchy}
          className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Parent-Child Hierarchy
        </button>
        
        <button 
          onClick={testValidation}
          className="px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Test Validation Rules
        </button>
        
        <button 
          onClick={testFiltering}
          className="px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Filtering & Queries
        </button>
        
        <button 
          onClick={testExportImport}
          className="px-4 py-3 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Test Export/Import
        </button>
        
        <button 
          onClick={testPerformance}
          className="px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Test Performance (111 entities)
        </button>
        
        <button 
          onClick={() => {
            testHierarchy();
            testValidation();
            testFiltering();
            testExportImport();
            testPerformance();
          }}
          className="px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-800 col-span-2"
        >
          Run All Tests
        </button>
      </div>
      
      {/* Test Results */}
      <div className="space-y-4">
        {Object.entries(testResults).map(([category, results]) => (
          <div key={category} className="bg-white border rounded-lg p-4">
            <h2 className="font-bold text-lg mb-2 capitalize">
              {category.replace(/([A-Z])/g, ' $1').trim()} Test Results:
            </h2>
            <div className="space-y-1">
              {results.map((result, i) => (
                <div 
                  key={i}
                  className={
                    result.startsWith('✅') ? 'text-green-600' : 
                    result.startsWith('⚠️') ? 'text-yellow-600' : 
                    'text-red-600'
                  }
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {Object.keys(testResults).length === 0 && (
        <div className="bg-gray-100 border rounded-lg p-8 text-center text-gray-500">
          Click a button above to run tests
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-300 rounded">
        <h3 className="font-bold mb-2">What These Tests Cover:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li><strong>Hierarchy:</strong> Parent-child relationships, getChildren, getDescendants</li>
          <li><strong>Validation:</strong> Entity type validation, required fields, parent-child rules</li>
          <li><strong>Filtering:</strong> Type filtering, compound filters, clear filters</li>
          <li><strong>Export/Import:</strong> Data serialization, backup/restore</li>
          <li><strong>Performance:</strong> Adding 100+ entities, querying, hierarchy traversal</li>
        </ul>
      </div>
    </div>
  );
}