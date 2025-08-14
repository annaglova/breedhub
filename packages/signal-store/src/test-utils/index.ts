/**
 * Test Utilities for SignalStore
 * 
 * FOR AI: Always use these utilities when testing
 */

import { createSignalStore } from '../create-signal-store';
import { createMultiStore } from '../multistore';
import type { Entity, AnyEntity } from '../types';

/**
 * Test result reporter
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * Test suite runner
 */
export class TestRunner {
  private results: TestResult[] = [];
  
  async test(name: string, fn: () => void | Promise<void>) {
    const start = Date.now();
    try {
      await fn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - start
      });
      console.log(`✅ ${name}`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start
      });
      console.error(`❌ ${name}: ${error}`);
    }
  }
  
  getResults() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    return {
      passed,
      failed,
      total,
      percentage: Math.round((passed / total) * 100),
      results: this.results
    };
  }
  
  printSummary() {
    const { passed, failed, total, percentage } = this.getResults();
    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${passed}/${total} passed (${percentage}%)`);
    if (failed > 0) {
      console.log(`\nFailed tests:`);
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  ❌ ${r.name}: ${r.error}`);
      });
    }
    console.log('='.repeat(50) + '\n');
  }
}

/**
 * Create test store with pre-configured features
 */
export function createTestStore<T extends Entity>(name = 'test-store') {
  return createSignalStore<T>(name, []);
}

/**
 * Create test MultiStore
 */
export function createTestMultiStore(name = 'test-multistore') {
  return createMultiStore(name);
}

/**
 * Test data generators
 */
export const TestData = {
  workspace: (overrides = {}): Partial<AnyEntity> => ({
    _type: 'workspace',
    id: `ws_${Date.now()}`,
    name: 'Test Workspace',
    visibility: 'public',
    permissions: { read: [], write: [], admin: [] },
    settings: {},
    ...overrides
  }),
  
  space: (parentId: string, overrides = {}): Partial<AnyEntity> => ({
    _type: 'space',
    id: `space_${Date.now()}`,
    _parentId: parentId,
    name: 'Test Space',
    collection: 'breeds',
    ...overrides
  }),
  
  breed: (parentId: string, overrides = {}): Partial<AnyEntity> => ({
    _type: 'breed',
    id: `breed_${Date.now()}`,
    _parentId: parentId,
    name: 'Test Breed',
    origin: 'Test Country',
    size: 'medium',
    description: 'Test description',
    temperament: ['Friendly'],
    exerciseNeeds: 'moderate',
    groomingNeeds: 'moderate',
    trainability: 'easy',
    barkingLevel: 'moderate',
    lifespan: '10-12 years',
    weight: { min: 20, max: 30 },
    height: { min: 40, max: 50 },
    coat: {
      type: 'short',
      colors: ['Brown'],
      hypoallergenic: false
    },
    ...overrides
  } as any)
};

/**
 * Assertion helpers
 */
export const assert = {
  exists: (value: any, message = 'Value should exist') => {
    if (value === null || value === undefined) {
      throw new Error(message);
    }
  },
  
  equals: (actual: any, expected: any, message = 'Values should be equal') => {
    if (actual !== expected) {
      throw new Error(`${message}. Expected: ${expected}, Got: ${actual}`);
    }
  },
  
  deepEquals: (actual: any, expected: any, message = 'Objects should be equal') => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
    }
  },
  
  throws: async (fn: () => any, message = 'Function should throw') => {
    try {
      await fn();
      throw new Error(message);
    } catch (e) {
      // Expected
    }
  },
  
  contains: (array: any[], item: any, message = 'Array should contain item') => {
    if (!array.includes(item)) {
      throw new Error(message);
    }
  },
  
  length: (array: any[], expectedLength: number, message = 'Array length mismatch') => {
    if (array.length !== expectedLength) {
      throw new Error(`${message}. Expected: ${expectedLength}, Got: ${array.length}`);
    }
  }
};

/**
 * Wait utilities
 */
export const wait = {
  ms: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  until: async (condition: () => boolean, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await wait.ms(interval);
    }
  },
  
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0))
};

/**
 * Mock data for testing
 */
export const MockData = {
  breeds: [
    { id: '1', name: 'Labrador', origin: 'Canada', size: 'large' },
    { id: '2', name: 'Poodle', origin: 'France', size: 'medium' },
    { id: '3', name: 'Bulldog', origin: 'England', size: 'medium' }
  ],
  
  pets: [
    { id: '1', name: 'Max', breedId: '1', birthDate: new Date('2020-01-01') },
    { id: '2', name: 'Bella', breedId: '2', birthDate: new Date('2021-06-15') }
  ]
};

/**
 * Performance testing
 */
export class PerformanceTest {
  private marks: Map<string, number> = new Map();
  
  start(name: string) {
    this.marks.set(name, performance.now());
  }
  
  end(name: string): number {
    const start = this.marks.get(name);
    if (!start) throw new Error(`No start mark for ${name}`);
    
    const duration = performance.now() - start;
    this.marks.delete(name);
    return duration;
  }
  
  measure(name: string, fn: () => void): number {
    this.start(name);
    fn();
    return this.end(name);
  }
  
  async measureAsync(name: string, fn: () => Promise<void>): Promise<number> {
    this.start(name);
    await fn();
    return this.end(name);
  }
}

/**
 * Store testing utilities
 */
export const StoreTest = {
  /**
   * Test that store triggers updates
   */
  testReactivity: async (store: any) => {
    let updateCount = 0;
    const unsubscribe = store.subscribe(() => updateCount++);
    
    store.addEntity({ id: 'test', name: 'Test' });
    await wait.nextTick();
    
    unsubscribe();
    return updateCount > 0;
  },
  
  /**
   * Test CRUD operations
   */
  testCRUD: async (store: any) => {
    // Create
    store.addEntity({ id: '1', name: 'Test' });
    assert.exists(store.getEntity?.('1') || store.computed?.entities?.get('1'));
    
    // Read
    const entity = store.getEntity?.('1') || store.computed?.entities?.get('1');
    assert.equals(entity.name, 'Test');
    
    // Update
    store.updateEntity('1', { name: 'Updated' });
    const updated = store.getEntity?.('1') || store.computed?.entities?.get('1');
    assert.equals(updated.name, 'Updated');
    
    // Delete
    store.removeEntity('1');
    const deleted = store.getEntity?.('1') || store.computed?.entities?.get('1');
    assert.equals(deleted, undefined);
    
    return true;
  }
};

/**
 * Snapshot testing
 */
export class SnapshotTest {
  private snapshots: Map<string, any> = new Map();
  
  capture(name: string, value: any) {
    this.snapshots.set(name, JSON.stringify(value, null, 2));
  }
  
  compare(name: string, value: any): boolean {
    const current = JSON.stringify(value, null, 2);
    const snapshot = this.snapshots.get(name);
    
    if (!snapshot) {
      this.capture(name, value);
      return true;
    }
    
    return current === snapshot;
  }
  
  getDiff(name: string, value: any): string | null {
    const current = JSON.stringify(value, null, 2);
    const snapshot = this.snapshots.get(name);
    
    if (!snapshot) return null;
    if (current === snapshot) return null;
    
    // Simple diff (in real app, use a proper diff library)
    return `Expected:\n${snapshot}\n\nGot:\n${current}`;
  }
}