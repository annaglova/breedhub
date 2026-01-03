import { useState } from 'react';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { appConfigStore } from '@breedhub/rxdb-store';

export function ForceSyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ synced: number; errors: string[] } | null>(null);

  const handleForceSync = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const syncResult = await appConfigStore.forceSyncToSupabase();
      setResult(syncResult);
    } catch (error) {
      setResult({
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeResult = () => {
    setResult(null);
  };

  return (
    <>
      <button
        onClick={handleForceSync}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Push all local configs to Supabase (useful for offline-created configs)"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {isLoading ? 'Syncing...' : 'Force Sync'}
      </button>

      {result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              {result.errors.length === 0 ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-amber-500" />
              )}
              <h3 className="text-lg font-semibold">
                {result.errors.length === 0 ? 'Sync Complete' : 'Sync Completed with Errors'}
              </h3>
            </div>

            <div className="bg-slate-50 rounded-md p-4 mb-4">
              <p className="text-sm text-slate-600">
                <strong>{result.synced}</strong> configs synced to Supabase
              </p>

              {result.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-sm text-red-600 font-medium mb-2">Errors:</p>
                  <ul className="text-sm text-red-500 list-disc list-inside">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {result.synced > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Next step:</strong> Run <code className="bg-blue-100 px-1 rounded">node scripts/rebuild-hierarchy.cjs full</code> to update the hierarchy.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeResult}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
