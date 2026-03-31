import { syncQueueService } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { CloudOff, Loader2, AlertTriangle } from "lucide-react";

/**
 * SyncStatusIndicator - Shows sync queue status in header.
 * Hidden when everything is synced. Shows:
 * - Spinning icon + count when items are pending
 * - Warning icon + count when items have failed
 */
export function SyncStatusIndicator() {
  useSignals();

  const pending = syncQueueService.pendingCount.value;
  const failed = syncQueueService.failedCount.value;

  // Nothing to show — fully synced
  if (pending === 0 && failed === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {pending > 0 && (
        <div className="flex items-center gap-1 text-xs text-slate-500" title={`${pending} changes syncing`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{pending}</span>
        </div>
      )}
      {failed > 0 && (
        <div className="flex items-center gap-1 text-xs text-amber-600" title={`${failed} changes failed to sync`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{failed}</span>
        </div>
      )}
    </div>
  );
}
