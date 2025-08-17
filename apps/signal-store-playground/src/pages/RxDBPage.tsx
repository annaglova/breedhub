import React, { useState } from 'react';
import { SimpleRxDBTest } from '../examples/SimpleRxDBTest';
import { Phase1ArchitectureDemo } from '../examples/Phase1ArchitectureDemo';

export default function RxDBPage() {
  const [activeTab, setActiveTab] = useState<'phase0' | 'phase1'>('phase0');
  
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🗄️ RxDB Integration Demo
          </h1>
          <p className="text-lg text-gray-600">
            Test RxDB with Signals integration for Local-First architecture
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('phase0')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'phase0' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Phase 0: Basic Setup ✅
          </button>
          <button
            onClick={() => setActiveTab('phase1')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'phase1' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Phase 1.0: Architecture 🆕
          </button>
        </div>

        {/* Phase 0 Content */}
        {activeTab === 'phase0' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-blue-800 mb-2">🧪 Phase 0 Testing</h2>
              <p className="text-blue-700 text-sm">
                This demo tests the basic RxDB setup as defined in our LOCAL_FIRST_ROADMAP.md:
              </p>
              <ul className="list-disc list-inside text-blue-700 text-sm mt-2 space-y-1">
                <li>✅ Database створюється та працює</li>
                <li>✅ CRUD операції успішні</li>
                <li>✅ SignalStore інтеграція реактивна</li>
                <li>✅ Schema validation працює</li>
                <li>✅ Playground demo функціонує</li>
              </ul>
            </div>

            <SimpleRxDBTest />
          </>
        )}

        {/* Phase 1 Content */}
        {activeTab === 'phase1' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-green-800 mb-2">🏗️ Phase 1.0: Architecture Improvements</h2>
              <p className="text-green-700 text-sm">
                Based on ngx-odm patterns, this demonstrates our enhanced architecture:
              </p>
              <ul className="list-disc list-inside text-green-700 text-sm mt-2 space-y-1">
                <li>✅ Collection Service Pattern - Unified CRUD interface</li>
                <li>✅ Lazy Collection Loading - Load collections on demand</li>
                <li>✅ Configuration Manager - Centralized configuration</li>
                <li>🔄 Breed Service - Domain-specific service with computed values</li>
                <li>🔄 Reactive Signals - Real-time updates with Preact Signals</li>
              </ul>
            </div>

            <Phase1ArchitectureDemo />
          </>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">📝 Testing Instructions</h3>
          <ol className="list-decimal list-inside text-gray-700 text-sm space-y-1">
            <li>Open browser DevTools (F12) → Application → Storage → IndexedDB</li>
            <li>You should see "breedhub-playground" database</li>
            <li>Click "Add Sample Data" to test bulk insert</li>
            <li>Add custom breed to test individual create</li>
            <li>Delete breeds to test remove operations</li>
            <li>Refresh page - data should persist (offline-first!)</li>
            <li>Check console for RxDB logs and errors</li>
          </ol>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">🎯 Expected Behavior</h3>
          <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
            <li><strong>Reactive Updates:</strong> UI updates instantly when data changes</li>
            <li><strong>Offline Storage:</strong> Data persists after page refresh</li>
            <li><strong>Schema Validation:</strong> Invalid data should be rejected</li>
            <li><strong>Performance:</strong> Operations should be fast (&lt;50ms)</li>
            <li><strong>No Memory Leaks:</strong> Subscriptions cleaned up properly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}