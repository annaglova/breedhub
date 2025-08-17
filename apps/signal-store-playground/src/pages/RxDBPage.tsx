import React from 'react';
import { SimpleRxDBTest } from '../examples/SimpleRxDBTest';

export default function RxDBPage() {
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