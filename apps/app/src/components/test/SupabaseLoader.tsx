import { spaceStore } from "@breedhub/rxdb-store";
import React, { useState } from "react";
import { checkSupabaseConnection } from "../../core/supabase";

export const SupabaseLoader: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "error"
  >("unknown");
  const [loadedEntities, setLoadedEntities] = useState<Map<string, boolean>>(
    new Map()
  );
  const [progress, setProgress] = useState<{
    entity: string;
    loaded: number;
    total: number;
  } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>("breed");
  const [entityData, setEntityData] = useState<any[]>([]);

  // Check Supabase connection
  const checkConnection = async () => {
    setLoading(true);
    try {
      const connected = await checkSupabaseConnection();
      setConnectionStatus(connected ? "connected" : "error");
    } catch (error) {
      console.error("Connection check failed:", error);
      setConnectionStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Load single entity type
  const loadEntity = async (entityType: string) => {
    setLoading(true);
    setProgress(null);

    try {
      const success = await spaceStore.loadFromSupabase(
        entityType,
        { limit: 100, orderBy: "created_at" },
        {
          batchSize: 20,
          onProgress: (p) => setProgress(p),
        }
      );

      setLoadedEntities((prev) => new Map(prev).set(entityType, success));

      if (success) {
        // Get data from SpaceStore to display
        const data = await spaceStore.getAll(entityType);
        setEntityData(data);
      }
    } catch (error) {
      console.error(`Failed to load ${entityType}:`, error);
      setLoadedEntities((prev) => new Map(prev).set(entityType, false));
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  // Load all available entities
  const loadAll = async () => {
    setLoading(true);
    setProgress(null);

    try {
      const results = await spaceStore.loadAllFromSupabase(
        { limit: 50 },
        {
          batchSize: 20,
          onProgress: (p) => setProgress(p),
        }
      );

      setLoadedEntities(results);
    } catch (error) {
      console.error("Failed to load all entities:", error);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  // Enable realtime sync
  const enableRealtime = async (entityType: string) => {
    try {
      await spaceStore.enableRealtimeSync(entityType);
      console.log(`Realtime sync enabled for ${entityType}`);
    } catch (error) {
      console.error(`Failed to enable realtime for ${entityType}:`, error);
    }
  };

  // Disable all realtime syncs
  const disableRealtime = async () => {
    try {
      await spaceStore.disableRealtimeSync();
      console.log("All realtime syncs disabled");
    } catch (error) {
      console.error("Failed to disable realtime:", error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Supabase Data Loader Test</h2>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Connection Status</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={checkConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Check Connection
          </button>
          <span
            className={`px-3 py-1 rounded ${
              connectionStatus === "connected"
                ? "bg-green-100 text-green-700"
                : connectionStatus === "error"
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {connectionStatus}
          </span>
        </div>
      </div>

      {/* Entity Loader */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Load Entity Data</h3>

        <div className="flex gap-4 mb-4">
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="breed">Breed</option>
          </select>

          <button
            onClick={() => loadEntity(selectedEntity)}
            disabled={loading || connectionStatus !== "connected"}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Load {selectedEntity}
          </button>

          <button
            onClick={loadAll}
            disabled={loading || connectionStatus !== "connected"}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Load All Available
          </button>
        </div>

        {/* Progress */}
        {progress && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <div className="text-sm text-blue-700">
              Loading {progress.entity}: {progress.loaded}/{progress.total}
            </div>
            <div className="mt-2 bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(progress.loaded / progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Sync Status */}
        {spaceStore.isSyncing.value && (
          <div className="mb-4 p-3 bg-yellow-50 rounded">
            <div className="text-sm text-yellow-700">Syncing data...</div>
          </div>
        )}
      </div>

      {/* Loaded Entities Status */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Loaded Entities</h3>
        <div className="grid grid-cols-3 gap-3">
          {Array.from(loadedEntities.entries()).map(([entity, success]) => (
            <div
              key={entity}
              className={`px-3 py-2 rounded ${
                success
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {entity}: {success ? "✓" : "✗"}
            </div>
          ))}
        </div>
      </div>

      {/* Realtime Controls */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Realtime Sync</h3>
        <div className="flex gap-4">
          <button
            onClick={() => enableRealtime(selectedEntity)}
            disabled={loading || !loadedEntities.get(selectedEntity)}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            Enable Realtime for {selectedEntity}
          </button>

          <button
            onClick={disableRealtime}
            disabled={loading}
            className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 disabled:opacity-50"
          >
            Disable All Realtime
          </button>
        </div>
      </div>

      {/* Data Preview */}
      {entityData.length > 0 && (
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">
            {selectedEntity} Data ({entityData.length} records)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs  text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {entityData.slice(0, 10).map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">
                      {item.name || "No name"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
