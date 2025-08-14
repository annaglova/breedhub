/**
 * MultiStore Test Suite
 * 
 * FOR AI: This is how you should test MultiStore features
 */

import { TestRunner, TestData, assert, wait, StoreTest } from '../../test-utils';
import { createMultiStore } from '../create-multistore';
import { ValidationError } from '../validators';

// Create test runner
const runner = new TestRunner();

// Test Suite
export async function runMultiStoreTests() {
  console.log('🧪 Starting MultiStore Tests...\n');
  
  // Test 1: Store Creation
  await runner.test('Should create MultiStore instance', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    assert.exists(store, 'Store should be created');
    assert.exists(store.addEntity, 'Store should have addEntity method');
    assert.exists(store.removeEntity, 'Store should have removeEntity method');
  });
  
  // Test 2: Add Workspace
  await runner.test('Should add workspace entity', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    const workspace = TestData.workspace();
    store.addEntity(workspace);
    
    const retrieved = store.getEntity(workspace.id!);
    assert.exists(retrieved, 'Workspace should be retrievable');
    assert.equals(retrieved?._type, 'workspace');
  });
  
  // Test 3: Parent-Child Relationships
  await runner.test('Should maintain parent-child relationships', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    // Add workspace
    const workspace = TestData.workspace();
    store.addEntity(workspace);
    
    // Add space with workspace as parent
    const space = TestData.space(workspace.id!);
    store.addEntity(space);
    
    // Check relationship
    const children = store.getEntitiesByParent(workspace.id!);
    assert.length(children, 1, 'Workspace should have 1 child');
    assert.equals(children[0].id, space.id);
  });
  
  // Test 4: Validation - Missing Parent
  await runner.test('Should reject entity with invalid parent', async () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    const space = TestData.space('non-existent-parent');
    
    await assert.throws(
      () => store.addEntity(space),
      'Should throw when parent does not exist'
    );
  });
  
  // Test 5: Validation - Invalid Type Relationship
  await runner.test('Should reject invalid parent-child type relationship', async () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    // Add workspace
    const workspace = TestData.workspace();
    store.addEntity(workspace);
    
    // Try to add breed directly to workspace (invalid)
    const breed = TestData.breed(workspace.id!);
    
    await assert.throws(
      () => store.addEntity(breed),
      'Should throw when parent-child types are incompatible'
    );
  });
  
  // Test 6: Cascade Delete
  await runner.test('Should cascade delete children', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    // Create hierarchy
    const workspace = TestData.workspace();
    store.addEntity(workspace);
    
    const space = TestData.space(workspace.id!);
    store.addEntity(space);
    
    const breed = TestData.breed(space.id!);
    store.addEntity(breed);
    
    // Delete workspace (should cascade)
    store.removeEntity(workspace.id!, true);
    
    // Check all are deleted
    assert.equals(store.getEntity(workspace.id!), undefined);
    assert.equals(store.getEntity(space.id!), undefined);
    assert.equals(store.getEntity(breed.id!), undefined);
  });
  
  // Test 7: Export/Import
  await runner.test('Should export and import store', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    // Add data
    const workspace = TestData.workspace({ name: 'Export Test' });
    store.addEntity(workspace);
    
    // Export
    const exported = store.exportStore();
    assert.exists(exported, 'Should export store');
    assert.equals(exported.includes('Export Test'), true, 'Export should contain data');
    
    // Clear and import
    store.clearStore();
    assert.equals(store.getEntity(workspace.id!), undefined, 'Store should be cleared');
    
    store.importStore(exported);
    const imported = store.getEntity(workspace.id!);
    assert.exists(imported, 'Should import data');
    assert.equals((imported as any).name, 'Export Test');
  });
  
  // Test 8: Query by Type
  await runner.test('Should query entities by type', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    // Add multiple entities
    store.addEntity(TestData.workspace({ id: 'ws1' }));
    store.addEntity(TestData.workspace({ id: 'ws2' }));
    
    const space = TestData.space('ws1', { id: 'sp1' });
    store.addEntity(space);
    
    // Query by type
    const workspaces = store.getEntitiesByType('workspace');
    assert.length(workspaces, 2, 'Should find 2 workspaces');
    
    const spaces = store.getEntitiesByType('space');
    assert.length(spaces, 1, 'Should find 1 space');
  });
  
  // Test 9: Update Entity
  await runner.test('Should update entity', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    const workspace = TestData.workspace({ name: 'Original' });
    store.addEntity(workspace);
    
    store.updateEntity(workspace.id!, { name: 'Updated' });
    
    const updated = store.getEntity(workspace.id!);
    assert.equals((updated as any).name, 'Updated');
    assert.equals(updated?._metadata?.version, 2, 'Version should increment');
  });
  
  // Test 10: Prevent Type Change
  await runner.test('Should prevent entity type change', async () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    const workspace = TestData.workspace();
    store.addEntity(workspace);
    
    await assert.throws(
      () => store.updateEntity(workspace.id!, { _type: 'space' } as any),
      'Should not allow type change'
    );
  });
  
  // Test 11: Store Validation
  await runner.test('Should validate entire store', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    // Add valid data
    const workspace = TestData.workspace();
    store.addEntity(workspace);
    
    const space = TestData.space(workspace.id!);
    store.addEntity(space);
    
    // Validate
    const result = store.validateStore();
    assert.equals(result.isValid, true, 'Store should be valid');
    assert.length(result.errors, 0, 'Should have no errors');
  });
  
  // Test 12: Hierarchy Navigation
  await runner.test('Should navigate hierarchy', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    // Create deep hierarchy
    const ws = TestData.workspace({ id: 'ws' });
    store.addEntity(ws);
    
    const space = TestData.space('ws', { id: 'space' });
    store.addEntity(space);
    
    const breed = TestData.breed('space', { id: 'breed' });
    store.addEntity(breed);
    
    // Get hierarchy
    const hierarchy = store.getHierarchy('ws');
    assert.exists(hierarchy, 'Should get hierarchy');
    assert.equals(hierarchy?.entity.id, 'ws');
    assert.length(hierarchy?.children || [], 1);
    assert.equals(hierarchy?.children[0].entity.id, 'space');
    assert.length(hierarchy?.children[0].children || [], 1);
    assert.equals(hierarchy?.children[0].children[0].entity.id, 'breed');
  });
  
  // Test 13: Find Entities
  await runner.test('Should find entities with predicate', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    // Add entities
    store.addEntity(TestData.workspace({ id: 'ws1', name: 'Public' }));
    store.addEntity(TestData.workspace({ id: 'ws2', name: 'Private' }));
    
    // Find by name
    const found = store.findEntities(e => (e as any).name?.includes('Public'));
    assert.length(found, 1);
    assert.equals(found[0].id, 'ws1');
  });
  
  // Test 14: Active Entity Management
  await runner.test('Should manage active entities', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    const workspace = TestData.workspace();
    store.addEntity(workspace);
    
    // Set active
    store.setActiveEntity(workspace.id!);
    
    // Get active
    const active = store.getActiveEntity('workspace');
    assert.exists(active);
    assert.equals(active?.id, workspace.id);
  });
  
  // Test 15: Batch Operations
  await runner.test('Should handle batch operations', () => {
    const useStore = createMultiStore('test');
    const store = useStore();
    
    const workspace = TestData.workspace({ id: 'ws' });
    const space = TestData.space('ws', { id: 'sp' });
    const breed = TestData.breed('sp', { id: 'br' });
    
    // Add batch (order shouldn't matter - should be sorted)
    store.addEntities([breed, workspace, space]);
    
    // All should be added
    assert.exists(store.getEntity('ws'));
    assert.exists(store.getEntity('sp'));
    assert.exists(store.getEntity('br'));
  });
  
  // Print summary
  runner.printSummary();
  
  return runner.getResults();
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && (window as any).runTests) {
  runMultiStoreTests();
}