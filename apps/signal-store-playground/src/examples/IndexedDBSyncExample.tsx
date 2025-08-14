import React, { useState, useEffect } from 'react';
import { 
  createSignalStore, 
  withEntities, 
  withFiltering,
  withRequestStatus,
  withFilteredEntities,
  useIndexedDBSync,
  type Entity 
} from '@breedhub/signal-store';
import { Cloud, CloudOff, Database, RefreshCw, Save, Trash2, Download, Upload } from 'lucide-react';

// Entity type
interface Task extends Entity {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

// Create store with IndexedDB sync support
const useTaskStore = createSignalStore<Task>('tasks', [
  withEntities<Task>(),
  withFiltering<Task>(),
  withFilteredEntities<Task>(),
  withRequestStatus(),
]);

export function IndexedDBSyncExample() {
  const store = useTaskStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(5000); // 5 seconds
  
  // IndexedDB sync hook
  const { syncState, syncNow, clearLocal, loadFromLocal } = useIndexedDBSync(
    {
      dbName: 'breedhub-playground',
      storeName: 'tasks',
      version: 1,
      autoSync,
      syncInterval,
    },
    store.computed.allEntities,
    store.setAllEntities
  );

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial data from IndexedDB
  useEffect(() => {
    loadFromLocal();
  }, []);

  // Track sync times
  useEffect(() => {
    if (syncState === 'synced') {
      setLastSyncTime(new Date());
    }
  }, [syncState]);

  // Add new task
  const addTask = () => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: `Task ${store.computed.totalEntities + 1}`,
      description: 'A new task created locally',
      completed: false,
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as Task['priority'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.addEntity(newTask);
  };

  // Toggle task completion
  const toggleTask = (id: string) => {
    const task = store.computed.entities.get(id);
    if (task) {
      store.updateEntity(id, { 
        completed: !task.completed,
        updatedAt: new Date(),
      });
    }
  };

  // Delete task
  const deleteTask = (id: string) => {
    store.removeEntity(id);
  };

  // Simulate server sync
  const simulateServerSync = async () => {
    store.setLoading();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate server response with some changes
    const serverTasks: Task[] = [
      {
        id: 'server-1',
        title: 'Task from server',
        description: 'This task was synced from the server',
        completed: false,
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncedAt: new Date(),
      },
      ...store.computed.allEntities.map(task => ({
        ...task,
        syncedAt: new Date(),
      })),
    ];
    
    store.setAllEntities(serverTasks);
    store.setSuccess();
    await syncNow();
  };

  // Clear all data
  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear all local data?')) {
      store.setAllEntities([]);
      await clearLocal();
    }
  };

  // Priority colors
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">IndexedDB Synchronization</h2>
      
      {/* Status Bar */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <><Cloud className="w-5 h-5 text-green-500" /> <span className="text-green-600">Online</span></>
              ) : (
                <><CloudOff className="w-5 h-5 text-red-500" /> <span className="text-red-600">Offline</span></>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <span className={`font-medium ${
                syncState === 'syncing' ? 'text-yellow-600' :
                syncState === 'synced' ? 'text-green-600' :
                syncState === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {syncState === 'syncing' ? 'Syncing...' :
                 syncState === 'synced' ? 'Synced' :
                 syncState === 'error' ? 'Sync Error' :
                 'Not Synced'}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {lastSyncTime && `Last sync: ${lastSyncTime.toLocaleTimeString()}`}
          </div>
        </div>
        
        {/* Sync Controls */}
        <div className="flex gap-2">
          <button
            onClick={syncNow}
            disabled={syncState === 'syncing'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
          
          <button
            onClick={simulateServerSync}
            disabled={store.requestStatus === 'loading'}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Simulate Server Sync
          </button>
          
          <button
            onClick={loadFromLocal}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <Upload className="w-4 h-4" />
            Load from IndexedDB
          </button>
          
          <button
            onClick={clearAllData}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
        
        {/* Auto Sync Toggle */}
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="rounded"
            />
            <span>Auto Sync</span>
          </label>
          
          {autoSync && (
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              className="px-3 py-1 border rounded"
            >
              <option value={5000}>Every 5s</option>
              <option value={10000}>Every 10s</option>
              <option value={30000}>Every 30s</option>
              <option value={60000}>Every 1m</option>
            </select>
          )}
        </div>
      </div>

      {/* Add Task Form */}
      <div className="mb-6 p-4 bg-white border rounded-lg">
        <button
          onClick={addTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Save className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {store.computed.allEntities.map((task) => (
          <div
            key={task.id}
            className={`p-4 bg-white border rounded-lg ${
              task.completed ? 'opacity-75' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="w-5 h-5 rounded"
                  />
                  <h3 className={`font-medium ${task.completed ? 'line-through' : ''}`}>
                    {task.title}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.syncedAt && (
                    <span className="text-xs text-green-600">✓ Synced</span>
                  )}
                </div>
                <p className="text-gray-600 mt-1 ml-8">{task.description}</p>
                <div className="text-xs text-gray-400 mt-2 ml-8">
                  Created: {task.createdAt.toLocaleString()}
                  {task.updatedAt !== task.createdAt && (
                    <> | Updated: {task.updatedAt.toLocaleString()}</>
                  )}
                  {task.syncedAt && (
                    <> | Synced: {task.syncedAt.toLocaleString()}</>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        
        {store.computed.totalEntities === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No tasks yet. Add one to test synchronization!</p>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">Debug Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Store State:</strong>
            <pre className="bg-white p-2 rounded mt-1">
              {JSON.stringify({
                totalTasks: store.computed.totalEntities,
                requestStatus: store.requestStatus,
                syncState,
                isOnline,
                autoSync,
              }, null, 2)}
            </pre>
          </div>
          <div>
            <strong>IndexedDB Info:</strong>
            <pre className="bg-white p-2 rounded mt-1">
              {JSON.stringify({
                dbName: 'breedhub-playground',
                storeName: 'tasks',
                version: 1,
                syncInterval: `${syncInterval}ms`,
                lastSync: lastSyncTime?.toISOString(),
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}