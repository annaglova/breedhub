import { useState, useEffect } from 'react';
import type { RxReplicationState } from 'rxdb/plugins/replication';
import { Subscription } from 'rxjs';

export interface ReplicationStatus {
  active: boolean;
  error: Error | null;
  pendingPush: number;
  pendingPull: number;
  lastSync: Date | null;
  completedPush: number;
  completedPull: number;
}

export function useReplicationState(
  replicationState: RxReplicationState<any, any> | null | undefined
): ReplicationStatus {
  const [status, setStatus] = useState<ReplicationStatus>({
    active: false,
    error: null,
    pendingPush: 0,
    pendingPull: 0,
    lastSync: null,
    completedPush: 0,
    completedPull: 0
  });

  useEffect(() => {
    if (!replicationState) return;

    const subscriptions: Subscription[] = [];

    // Subscribe to active status
    subscriptions.push(
      replicationState.active$.subscribe((active: boolean) => {
        setStatus(prev => ({ ...prev, active }));
      })
    );

    // Subscribe to errors
    subscriptions.push(
      replicationState.error$.subscribe((error: Error | null) => {
        setStatus(prev => ({ ...prev, error }));
      })
    );

    // Subscribe to sync events - these might not exist
    if ((replicationState as any).send$) {
      subscriptions.push(
        (replicationState as any).send$.subscribe(() => {
          setStatus(prev => ({
            ...prev,
            completedPush: prev.completedPush + 1,
            lastSync: new Date()
          }));
        })
      );
    }

    if ((replicationState as any).received$) {
      subscriptions.push(
        (replicationState as any).received$.subscribe(() => {
          setStatus(prev => ({
            ...prev,
            completedPull: prev.completedPull + 1,
            lastSync: new Date()
          }));
        })
      );
    }

    // Clean up subscriptions
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [replicationState]);

  return status;
}

// Component for displaying sync status
export interface SyncStatusIndicatorProps {
  replicationState: RxReplicationState<any, any> | null | undefined;
  className?: string;
}

export function SyncStatusIndicator({ 
  replicationState, 
  className = '' 
}: SyncStatusIndicatorProps) {
  const status = useReplicationState(replicationState);

  const getStatusColor = () => {
    if (status.error) return 'text-red-500';
    if (status.active) return 'text-green-500';
    return 'text-slate-500';
  };

  const getStatusText = () => {
    if (status.error) return `Error: ${status.error.message}`;
    if (status.active) return 'Syncing...';
    if (status.lastSync) {
      const seconds = Math.floor((Date.now() - status.lastSync.getTime()) / 1000);
      if (seconds < 60) return `Synced ${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      return `Synced ${minutes}m ago`;
    }
    return 'Not synced';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${status.active ? 'animate-pulse' : ''} ${getStatusColor()}`} />
      <span className={`text-sm ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {(status.completedPush > 0 || status.completedPull > 0) && (
        <span className="text-xs text-slate-400">
          (↑{status.completedPush} ↓{status.completedPull})
        </span>
      )}
    </div>
  );
}