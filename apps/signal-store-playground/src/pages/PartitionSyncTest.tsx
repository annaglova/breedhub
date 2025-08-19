import React, { useState, useEffect } from 'react';
import { Database, Server, Filter, Layers, Activity, ChevronRight, Check } from 'lucide-react';
import { getBreedHubDB } from '@breedhub/rxdb-store';
import { PartitionSyncManager, estimateSyncVolume, BreedSelector } from '@breedhub/rxdb-store/src/supabase/partition-sync-manager';
import { MAIN_TABLES, PARTITION_STRATEGY } from '@breedhub/rxdb-store/src/supabase/main-tables-schema';
import { discoverAllTables } from '@breedhub/rxdb-store/src/supabase/advanced-schema-inspector';

export default function PartitionSyncTest() {
  const [syncManager, setSyncManager] = useState<PartitionSyncManager | null>(null);
  const [selectedBreeds, setSelectedBreeds] = useState<string[]>([]);
  const [availableBreeds, setAvailableBreeds] = useState<string[]>([]);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [volumeEstimate, setVolumeEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any>(null);

  // Sample breeds for testing
  const sampleBreeds = [
    { id: 'labrador', name: 'Labrador Retriever' },
    { id: 'german_shepherd', name: 'German Shepherd' },
    { id: 'golden_retriever', name: 'Golden Retriever' },
    { id: 'french_bulldog', name: 'French Bulldog' },
    { id: 'poodle', name: 'Poodle' },
    { id: 'beagle', name: 'Beagle' },
    { id: 'rottweiler', name: 'Rottweiler' },
    { id: 'yorkshire_terrier', name: 'Yorkshire Terrier' },
    { id: 'dachshund', name: 'Dachshund' },
    { id: 'siberian_husky', name: 'Siberian Husky' }
  ];

  useEffect(() => {
    initializeSyncManager();
  }, []);

  const initializeSyncManager = async () => {
    try {
      const db = await getBreedHubDB();
      const manager = new PartitionSyncManager(db);
      setSyncManager(manager);
      console.log('✅ Partition Sync Manager initialized');
    } catch (error) {
      console.error('Failed to initialize sync manager:', error);
    }
  };

  const discoverTables = async () => {
    setLoading(true);
    try {
      const results = await discoverAllTables();
      setDiscoveryResults(results);
      console.log('🔍 Discovery results:', results);
      
      // Extract available breeds from partition patterns
      const breeds = new Set<string>();
      results.patterns.forEach((pattern: string) => {
        // Extract breed from pattern like "pets_p_*" or "pets_breed_*"
        const match = pattern.match(/_(p|breed)_\*/);
        if (match) {
          // Add sample breeds as available
          sampleBreeds.forEach(b => breeds.add(b.id));
        }
      });
      
      setAvailableBreeds(Array.from(breeds));
    } catch (error) {
      console.error('Discovery failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBreed = (breedId: string) => {
    setSelectedBreeds(prev => {
      const newBreeds = prev.includes(breedId)
        ? prev.filter(b => b !== breedId)
        : [...prev, breedId];
      
      // Update sync manager
      if (syncManager) {
        syncManager.setActiveBreeds(newBreeds);
      }
      
      // Update volume estimate
      const estimate = estimateSyncVolume(newBreeds.length);
      setVolumeEstimate(estimate);
      
      return newBreeds;
    });
  };

  const startSync = async () => {
    if (!syncManager || selectedBreeds.length === 0) {
      alert('Please select at least one breed to sync');
      return;
    }

    setLoading(true);
    try {
      // Sync data for selected breeds
      for (const breedId of selectedBreeds) {
        await syncManager.syncBreedData(breedId);
      }
      
      // Setup realtime sync
      await syncManager.setupRealtimeSync();
      
      // Get sync stats
      const stats = await syncManager.getSyncStats();
      setSyncStats(stats);
      
      alert(`✅ Successfully synced data for ${selectedBreeds.length} breeds`);
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed - check console for details');
    } finally {
      setLoading(false);
    }
  };

  const getOptimalBreeds = async () => {
    const selector = new BreedSelector(5);
    
    // Set some priority breeds
    selector.setPriorityBreeds(['labrador', 'german_shepherd']);
    
    // Get optimal selection
    const optimal = await selector.getOptimalBreedSelection(
      ['golden_retriever', 'poodle'], // recently used
      ['french_bulldog', 'labrador', 'german_shepherd'], // popular
      ['beagle', 'rottweiler'] // favorites
    );
    
    setSelectedBreeds(optimal);
    if (syncManager) {
      syncManager.setActiveBreeds(optimal);
    }
    
    const estimate = estimateSyncVolume(optimal.length);
    setVolumeEstimate(estimate);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Layers className="w-8 h-8" />
            Partition Sync Strategy Test
          </h1>
          <p className="text-lg text-gray-600">
            Testing sync strategy for 800+ partitioned tables with ~20 RxDB collections
          </p>
        </div>

        {/* Strategy Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">📋 Strategy Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Approach:</h3>
              <p className="text-sm text-blue-700">{PARTITION_STRATEGY.description}</p>
              <ul className="mt-2 space-y-1">
                {PARTITION_STRATEGY.advantages.map((adv, i) => (
                  <li key={i} className="text-sm text-blue-600 flex items-start gap-1">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Main Tables (~20):</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(MAIN_TABLES).slice(0, 10).map(([table, config]) => (
                  <div key={table} className="text-sm">
                    <span className="font-medium">{table}</span>
                    {config.hasPartitions && (
                      <span className="text-xs text-blue-600 ml-1">(partitioned)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🎮 Sync Controls</h2>
          
          <div className="flex gap-3 mb-6">
            <button
              onClick={discoverTables}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
            >
              🔍 Discover Tables
            </button>
            
            <button
              onClick={getOptimalBreeds}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🎯 Auto-Select Optimal Breeds
            </button>
            
            <button
              onClick={startSync}
              disabled={loading || selectedBreeds.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
            >
              {loading ? '⏳ Syncing...' : '🔄 Start Sync'}
            </button>
          </div>

          {/* Discovery Results */}
          {discoveryResults && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Discovery Results:</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Tables:</span>
                  <span className="ml-2 font-semibold">{discoveryResults.summary.totalTables}</span>
                </div>
                <div>
                  <span className="text-gray-600">Partitioned:</span>
                  <span className="ml-2 font-semibold">{discoveryResults.summary.totalPartitioned}</span>
                </div>
                <div>
                  <span className="text-gray-600">API Tables:</span>
                  <span className="ml-2 font-semibold">{discoveryResults.summary.totalFromAPI}</span>
                </div>
              </div>
              {discoveryResults.patterns.length > 0 && (
                <div className="mt-3">
                  <span className="text-gray-600 text-sm">Partition Patterns:</span>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {discoveryResults.patterns.map((pattern: string) => (
                      <code key={pattern} className="text-xs bg-white px-2 py-1 rounded">
                        {pattern}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Breed Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Select Breeds to Sync:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {sampleBreeds.map(breed => (
                <button
                  key={breed.id}
                  onClick={() => toggleBreed(breed.id)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedBreeds.includes(breed.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium">{breed.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{breed.id}</div>
                  {selectedBreeds.includes(breed.id) && (
                    <Check className="w-4 h-4 text-purple-600 mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Estimate */}
          {volumeEstimate && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">📊 Sync Volume Estimate:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Pets:</span>
                  <span className="ml-2 font-semibold">
                    {volumeEstimate.documentCounts.pets.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Photos:</span>
                  <span className="ml-2 font-semibold">
                    {volumeEstimate.documentCounts.photos.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Documents:</span>
                  <span className="ml-2 font-semibold">
                    {volumeEstimate.documentCounts.documents.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Est. Size:</span>
                  <span className="ml-2 font-semibold">
                    {volumeEstimate.estimatedSizeMB.total.toFixed(2)} MB
                  </span>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Recommendation:</span>
                <span className="ml-2 font-medium text-green-700">
                  {volumeEstimate.recommendation}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sync Statistics */}
        {syncStats && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Sync Statistics
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Active Breeds:</h3>
                <div className="flex gap-2 flex-wrap">
                  {syncStats.activeBreeds.map((breed: string) => (
                    <span key={breed} className="px-3 py-1 bg-purple-100 rounded-full text-sm">
                      {breed}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Collection Counts:</h3>
                <div className="space-y-2">
                  {Object.entries(syncStats.collections).map(([collection, stats]: [string, any]) => (
                    <div key={collection} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{collection}</span>
                      <div className="text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-2 font-semibold">{stats.total}</span>
                        {stats.byBreed && (
                          <span className="ml-4 text-xs text-gray-500">
                            ({Object.keys(stats.byBreed).length} breeds)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Implementation Notes */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📝 Implementation Notes:</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li>1. <strong>Main Collections:</strong> Only ~20 RxDB collections for main tables</li>
            <li>2. <strong>Partition Handling:</strong> Pets partitioned by breed_id in PostgreSQL, filtered in RxDB</li>
            <li>3. <strong>Selective Sync:</strong> Only sync data for selected breeds to manage volume</li>
            <li>4. <strong>Query Pattern:</strong> Use breed_id index for efficient filtering</li>
            <li>5. <strong>Realtime Updates:</strong> Subscribe to changes filtered by active breeds</li>
            <li>6. <strong>Memory Management:</strong> Significantly lower memory footprint vs 800+ collections</li>
          </ol>
        </div>
      </div>
    </div>
  );
}