// Background Sync Service for offline operations
interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class BackgroundSyncService {
  private readonly SYNC_TAG = 'breedhub-sync';
  private readonly PENDING_OPS_KEY = 'pending_operations';
  private syncInProgress = false;

  constructor() {
    this.registerSyncEvent();
    this.setupPeriodicSync();
  }

  // Register service worker sync event
  private async registerSyncEvent() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Register one-time background sync
        await (registration as any).sync.register(this.SYNC_TAG);
        console.log('✅ One-time background sync registered');
      } catch (error: any) {
        // This is normal in development - fallback to regular sync
        if (error.name === 'NotAllowedError') {
          console.log('ℹ️ Background sync not available, will sync when online');
          // Fallback to immediate sync if online
          if (navigator.onLine) {
            setTimeout(() => this.syncPendingOperations(), 1000);
          }
        } else {
          console.warn('Background sync registration failed:', error.message);
        }
      }
    } else {
      console.log('Background sync not supported - using fallback');
      // Fallback for browsers without background sync
      if (navigator.onLine) {
        setTimeout(() => this.syncPendingOperations(), 1000);
      }
    }
  }

  // Setup periodic background sync
  private async setupPeriodicSync() {
    // Only try periodic sync if PWA is installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    if (!isStandalone) {
      console.log('Periodic sync skipped - PWA not installed');
      return;
    }
    
    if ('serviceWorker' in navigator && 'PeriodicSyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      
      try {
        // Check if permission is granted
        const status = await (navigator as any).permissions?.query({
          name: 'periodic-background-sync',
        });
        
        if (status?.state === 'granted') {
          // Request periodic background sync (minimum 12 hours)
          await (registration as any).periodicSync.register('periodic-data-sync', {
            minInterval: 12 * 60 * 60 * 1000 // 12 hours
          });
          console.log('✅ Periodic sync registered successfully');
        } else {
          console.log('⚠️ Periodic sync permission not granted (this is normal in development)');
        }
      } catch (error: any) {
        // This is expected in development environment
        if (error.name === 'NotAllowedError') {
          console.log('ℹ️ Periodic sync not available (requires installed PWA + HTTPS)');
        } else {
          console.warn('Periodic sync setup failed:', error.message);
        }
      }
    } else {
      console.log('Periodic sync not supported in this browser');
    }
  }

  // Add operation to pending queue
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) {
    const pendingOps = this.getPendingOperations();
    
    const newOp: PendingOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    };
    
    pendingOps.push(newOp);
    this.savePendingOperations(pendingOps);
    
    // Update pending count in localStorage
    localStorage.setItem('pendingChanges', String(pendingOps.length));
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncPendingOperations();
    } else {
      // Register for sync when back online
      this.registerSyncEvent();
    }
    
    return newOp.id;
  }

  // Get all pending operations
  getPendingOperations(): PendingOperation[] {
    const stored = localStorage.getItem(this.PENDING_OPS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Save pending operations
  private savePendingOperations(operations: PendingOperation[]) {
    localStorage.setItem(this.PENDING_OPS_KEY, JSON.stringify(operations));
    localStorage.setItem('pendingChanges', String(operations.length));
  }

  // Sync all pending operations
  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    const operations = this.getPendingOperations();
    const failedOps: PendingOperation[] = [];

    console.log(`Starting sync of ${operations.length} pending operations`);

    for (const op of operations) {
      try {
        await this.executeOperation(op);
        console.log(`Successfully synced operation ${op.id}`);
      } catch (error) {
        console.error(`Failed to sync operation ${op.id}:`, error);
        
        // Increment retry count and keep for retry
        op.retryCount++;
        
        // Only retry up to 3 times
        if (op.retryCount < 3) {
          failedOps.push(op);
        } else {
          console.error(`Operation ${op.id} failed after 3 retries, discarding`);
          // Could store in a dead letter queue here
        }
      }
    }

    // Save failed operations for retry
    this.savePendingOperations(failedOps);
    
    // Update last sync time if we had any success
    if (failedOps.length < operations.length) {
      localStorage.setItem('lastSyncTime', new Date().toISOString());
    }

    this.syncInProgress = false;
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('sync-completed', {
      detail: {
        synced: operations.length - failedOps.length,
        failed: failedOps.length
      }
    }));
  }

  // Execute a single operation
  private async executeOperation(operation: PendingOperation): Promise<void> {
    // This would integrate with your actual backend/Supabase
    // For now, we'll simulate the operation
    
    const endpoint = `/api/${operation.collection}`;
    const method = operation.type === 'DELETE' ? 'DELETE' : 
                   operation.type === 'CREATE' ? 'POST' : 'PUT';
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate occasional failures for testing
    if (Math.random() > 0.9 && operation.retryCount === 0) {
      throw new Error('Simulated network error');
    }
    
    // In real implementation:
    // const response = await fetch(endpoint, {
    //   method,
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(operation.data)
    // });
    // 
    // if (!response.ok) {
    //   throw new Error(`Sync failed: ${response.status}`);
    // }
    
    console.log(`Operation executed: ${method} ${endpoint}`, operation.data);
  }

  // Clear all pending operations
  clearPendingOperations() {
    localStorage.removeItem(this.PENDING_OPS_KEY);
    localStorage.setItem('pendingChanges', '0');
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: navigator.onLine,
      syncInProgress: this.syncInProgress,
      pendingCount: this.getPendingOperations().length,
      lastSync: localStorage.getItem('lastSyncTime')
    };
  }
}

// Create singleton instance
export const backgroundSync = new BackgroundSyncService();

// Listen for online event to trigger sync
window.addEventListener('online', () => {
  console.log('Back online, triggering sync...');
  backgroundSync.syncPendingOperations();
});

// Export types
export type { PendingOperation };