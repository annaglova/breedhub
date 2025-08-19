import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Database, Cloud, Wifi, WifiOff } from 'lucide-react';
import { checkSupabaseConnection, supabase } from '@breedhub/rxdb-store/src/supabase/client';
import { syncManager } from '@breedhub/rxdb-store/src/supabase/sync-manager';
import { getBreedHubDB } from '@breedhub/rxdb-store';

export default function SupabaseSyncTest() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [syncStatus, setSyncStatus] = useState(syncManager.getStatus());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    checkConnection();
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Subscribe to sync status changes
    const unsubscribe = syncManager.status.subscribe((status) => {
      setSyncStatus(status);
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    const isConnected = await checkSupabaseConnection();
    setConnectionStatus(isConnected ? 'connected' : 'error');
  };

  const testSupabaseConnection = async () => {
    const results = [];
    
    // Test 1: Basic connection
    results.push({
      test: 'Basic Connection',
      status: connectionStatus === 'connected' ? 'success' : 'error',
      message: connectionStatus === 'connected' ? 'Connected to Supabase' : 'Connection failed'
    });
    
    // Test 2: Auth status
    try {
      const { data: { user } } = await supabase.auth.getUser();
      results.push({
        test: 'Auth Status',
        status: 'success',
        message: user ? `Authenticated as ${user.id}` : 'Not authenticated'
      });
    } catch (error: any) {
      results.push({
        test: 'Auth Status',
        status: 'error',
        message: error.message
      });
    }
    
    // Test 3: Database query
    try {
      const { data, error } = await supabase
        .from('breeds')
        .select('count')
        .limit(1);
      
      if (error?.code === 'PGRST116') {
        results.push({
          test: 'Database Query',
          status: 'warning',
          message: 'Table not found (needs migration)'
        });
      } else if (error) {
        results.push({
          test: 'Database Query',
          status: 'error',
          message: error.message
        });
      } else {
        results.push({
          test: 'Database Query',
          status: 'success',
          message: 'Query successful'
        });
      }
    } catch (error: any) {
      results.push({
        test: 'Database Query',
        status: 'error',
        message: error.message
      });
    }
    
    // Test 4: RxDB Database
    try {
      const db = await getBreedHubDB();
      results.push({
        test: 'RxDB Database',
        status: db ? 'success' : 'error',
        message: db ? 'RxDB initialized' : 'RxDB not initialized'
      });
    } catch (error: any) {
      results.push({
        test: 'RxDB Database',
        status: 'error',
        message: error.message
      });
    }
    
    setTestResults(results);
  };

  const initializeSync = async () => {
    try {
      const db = await getBreedHubDB();
      await syncManager.initialize(db);
      
      await syncManager.startSync({
        collections: ['breeds', 'dogs'],
        batchSize: 50,
        syncInterval: 30000, // 30 seconds
        enableRealtime: true
      });
      
      alert('Sync initialized successfully!');
    } catch (error: any) {
      console.error('Sync initialization failed:', error);
      alert(`Sync initialization failed: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <div className="w-5 h-5 rounded-full bg-yellow-600" />;
      default: return <div className="w-5 h-5 rounded-full bg-gray-400" />;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔄 Phase 2: Supabase Sync Testing
          </h1>
          <p className="text-lg text-gray-600">
            Test Supabase connection and RxDB replication
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Cloud className="w-6 h-6" />
              Supabase Connection
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <div className="flex items-center gap-2">
                  {connectionStatus === 'checking' && (
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  )}
                  {connectionStatus === 'connected' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {connectionStatus === 'error' && (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    connectionStatus === 'connected' ? 'text-green-600' :
                    connectionStatus === 'error' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {connectionStatus === 'checking' ? 'Checking...' :
                     connectionStatus === 'connected' ? 'Connected' : 'Connection Failed'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Network:</span>
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-green-600" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600 mb-2">Supabase URL:</p>
                <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                  http://dev.dogarray.com:8020
                </code>
              </div>
              
              <button
                onClick={checkConnection}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry Connection
              </button>
            </div>
          </div>

          {/* Sync Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Sync Status
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active:</span>
                <span className={`font-semibold ${
                  syncStatus.isActive ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {syncStatus.isActive ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Paused:</span>
                <span className={`font-semibold ${
                  syncStatus.isPaused ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {syncStatus.isPaused ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Sync:</span>
                <span className="text-sm">
                  {syncStatus.lastSync 
                    ? new Date(syncStatus.lastSync).toLocaleTimeString()
                    : 'Never'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pending Changes:</span>
                <span className="font-semibold">
                  {syncStatus.pendingChanges}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Collections:</span>
                <span className="font-semibold">
                  {syncStatus.collections.size}
                </span>
              </div>
              
              {syncStatus.errors.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-red-600 font-semibold mb-1">Recent Errors:</p>
                  <div className="text-xs text-red-500 max-h-20 overflow-y-auto">
                    {syncStatus.errors.slice(-3).map((error, i) => (
                      <div key={i}>{error.message}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connection Tests */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🧪 Connection Tests</h2>
            
            <button
              onClick={testSupabaseConnection}
              className="w-full mb-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Run All Tests
            </button>
            
            {testResults.length > 0 && (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    <span className={`text-sm ${getStatusColor(result.status)}`}>
                      {result.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🎮 Sync Controls</h2>
            
            <div className="space-y-3">
              <button
                onClick={initializeSync}
                disabled={syncStatus.isActive}
                className={`w-full px-4 py-2 rounded font-semibold ${
                  syncStatus.isActive
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                Initialize Sync
              </button>
              
              <button
                onClick={() => syncManager.syncAll()}
                disabled={!syncStatus.isActive}
                className={`w-full px-4 py-2 rounded font-semibold ${
                  !syncStatus.isActive
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Force Sync Now
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => syncManager.pauseAll()}
                  disabled={!syncStatus.isActive || syncStatus.isPaused}
                  className={`px-4 py-2 rounded font-semibold ${
                    !syncStatus.isActive || syncStatus.isPaused
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
                >
                  Pause
                </button>
                
                <button
                  onClick={() => syncManager.resumeAll()}
                  disabled={!syncStatus.isPaused}
                  className={`px-4 py-2 rounded font-semibold ${
                    !syncStatus.isPaused
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Resume
                </button>
              </div>
              
              <button
                onClick={() => syncManager.stopAll()}
                disabled={!syncStatus.isActive}
                className={`w-full px-4 py-2 rounded font-semibold ${
                  !syncStatus.isActive
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Stop All Sync
              </button>
            </div>
          </div>
        </div>

        {/* Collection Status */}
        {syncStatus.collections.size > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📚 Collection Sync Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from(syncStatus.collections.values()).map((collection) => (
                <div key={collection.name} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{collection.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      collection.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {collection.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Last Pull: {collection.lastPull ? new Date(collection.lastPull).toLocaleTimeString() : 'Never'}</div>
                    <div>Last Push: {collection.lastPush ? new Date(collection.lastPush).toLocaleTimeString() : 'Never'}</div>
                    <div>Pending: {collection.pendingDocs} documents</div>
                    {collection.errors.length > 0 && (
                      <div className="text-red-600">Errors: {collection.errors.length}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-3">
            📖 Testing Instructions
          </h3>
          <ol className="space-y-2 text-sm text-yellow-800">
            <li>1. Click "Run All Tests" to check Supabase connection</li>
            <li>2. If all tests pass, click "Initialize Sync"</li>
            <li>3. Create/modify data in RxDB collections</li>
            <li>4. Watch sync status update in real-time</li>
            <li>5. Use "Force Sync Now" to trigger manual sync</li>
            <li>6. Test offline mode by going offline and making changes</li>
          </ol>
        </div>
      </div>
    </div>
  );
}