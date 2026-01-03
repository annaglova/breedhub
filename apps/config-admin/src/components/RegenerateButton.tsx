import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@breedhub/rxdb-store';

export function RegenerateButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleRegenerate = async () => {
    setIsLoading(true);
    setShowInstructions(true);

    // Since we can't run Node.js scripts directly from browser,
    // show instructions for manual execution
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleManualComplete = () => {
    setShowInstructions(false);
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={handleRegenerate}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Regenerate configurations from entity schemas"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {isLoading ? 'Processing...' : 'Regenerate Configs'}
      </button>

      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Manual Regeneration Required</h3>
            
            <div className="bg-slate-50 rounded-md p-4 mb-4">
              <p className="text-sm text-slate-600 mb-3">
                Run these commands in your terminal:
              </p>
              <code className="block bg-slate-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
                <span className="text-slate-400"># Navigate to config-admin directory:</span><br/>
                cd apps/config-admin<br/><br/>
                <span className="text-slate-400"># 0. Generate entity JSON structures from database (if DB schema changed):</span><br/>
                node scripts/generate-entity-configs.cjs<br/>
                <span className="text-slate-400"># This takes a while - reads all tables and generates JSON files</span><br/><br/>
                <span className="text-slate-400"># 1. Generate semantic tree:</span><br/>
                node scripts/analyze-fields.cjs<br/><br/>
                <span className="text-slate-400"># 2. Generate SQL and run cascade:</span><br/>
                node scripts/generate-sql-inserts.cjs<br/>
                <span className="text-slate-400"># Answer 'y' when prompted to insert to database</span><br/><br/>
                <span className="text-slate-400"># 3. (Optional) Rebuild full hierarchy:</span><br/>
                node scripts/rebuild-hierarchy.cjs full
              </code>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your override_data will be preserved during regeneration.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualComplete}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                I've Run the Commands
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}