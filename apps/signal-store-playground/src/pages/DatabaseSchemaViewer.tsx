import React, { useState, useEffect } from 'react';
import { Database, Table, Key, Link, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { 
  inspectDatabaseSchema, 
  getDetailedTableInfo,
  generateRxDBSchema 
} from '@breedhub/rxdb-store/src/supabase/schema-inspector';
import {
  discoverAllTables,
  estimateTableCount,
  introspectSupabaseAPI,
  getTableWithPartitions
} from '@breedhub/rxdb-store/src/supabase/advanced-schema-inspector';

export default function DatabaseSchemaViewer() {
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableDetails, setTableDetails] = useState<any>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [discoveryResults, setDiscoveryResults] = useState<any>(null);
  const [tableCount, setTableCount] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');

  const inspectSchema = async () => {
    setLoading(true);
    try {
      if (viewMode === 'basic') {
        const { schema, results } = await inspectDatabaseSchema();
        setSchema(schema);
        setResults(results);
        console.log('Database schema:', schema);
        console.log('Inspection results:', results);
      } else {
        // Advanced discovery
        const discovery = await discoverAllTables();
        setDiscoveryResults(discovery);
        console.log('🔍 Advanced Discovery Results:', discovery);
        
        // Estimate total count
        const count = await estimateTableCount();
        setTableCount(count);
        console.log('📊 Table Count:', count);
        
        // Also get basic schema for found tables
        const { schema, results } = await inspectDatabaseSchema();
        setSchema(schema);
        setResults({
          found: discovery.allTables,
          notFound: [],
          error: []
        });
      }
    } catch (error) {
      console.error('Failed to inspect schema:', error);
      alert('Failed to inspect database schema');
    } finally {
      setLoading(false);
    }
  };

  const loadTableDetails = async (tableName: string) => {
    setSelectedTable(tableName);
    const details = await getDetailedTableInfo(tableName);
    setTableDetails(details);
    
    // Check for partitions
    const partitionInfo = await getTableWithPartitions(tableName);
    if (partitionInfo.isPartitioned) {
      console.log(`📦 ${tableName} is partitioned:`, partitionInfo);
    }
    
    // Generate RxDB schema
    if (details?.structure) {
      const rxdbSchema = generateRxDBSchema(details.structure);
      console.log(`RxDB Schema for ${tableName}:`, rxdbSchema);
    }
  };

  const toggleTableExpanded = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
      loadTableDetails(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const filteredTables = results?.found.filter((table: string) => 
    table.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const copyRxDBSchema = (tableName: string) => {
    if (schema[tableName]) {
      const rxdbSchema = generateRxDBSchema(schema[tableName]);
      const schemaString = JSON.stringify(rxdbSchema, null, 2);
      navigator.clipboard.writeText(schemaString);
      alert(`RxDB schema for ${tableName} copied to clipboard!`);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Database className="w-8 h-8" />
            Database Schema Viewer
          </h1>
          <p className="text-lg text-gray-600">
            Inspect your Supabase database structure and generate RxDB schemas
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={inspectSchema}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-semibold ${
                loading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {loading ? 'Inspecting...' : viewMode === 'basic' ? '🔍 Inspect Database' : '🔬 Advanced Discovery'}
            </button>
            
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => setViewMode('basic')}
                className={`px-4 py-2 ${
                  viewMode === 'basic' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Basic Mode
              </button>
              <button
                onClick={() => setViewMode('advanced')}
                className={`px-4 py-2 ${
                  viewMode === 'advanced' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Advanced Mode
              </button>
            </div>
          
            {tableCount && (
              <div className="text-sm px-4 py-2 bg-blue-100 rounded-lg inline-block">
                {tableCount.message}
              </div>
            )}
          </div>
          
          {results && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">✅ Found: {results.found.length}</span>
              <span className="text-red-600">❌ Not found: {results.notFound.length}</span>
              {results.error.length > 0 && (
                <span className="text-yellow-600">⚠️ Errors: {results.error.length}</span>
              )}
              {discoveryResults && (
                <>
                  <span className="text-blue-600">📦 Partitioned: {discoveryResults.summary.totalPartitioned}</span>
                  <span className="text-purple-600">🌐 API Tables: {discoveryResults.summary.totalFromAPI}</span>
                </>
              )}
            </div>
          )}
        </div>

        {results && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tables List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-2">Tables</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search tables..."
                      className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {filteredTables.map((tableName: string) => (
                    <div
                      key={tableName}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        selectedTable === tableName 
                          ? 'bg-purple-100 border-purple-500 border' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => toggleTableExpanded(tableName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expandedTables.has(tableName) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <Table className="w-4 h-4 text-gray-600" />
                          <span className="font-medium">{tableName}</span>
                        </div>
                        {schema[tableName] && (
                          <span className="text-xs text-gray-500">
                            {schema[tableName].columns.length} cols
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {results.notFound.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Not Found:</h3>
                    <div className="text-xs text-red-600">
                      {results.notFound.join(', ')}
                    </div>
                  </div>
                )}
                
                {discoveryResults && discoveryResults.patterns.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Partition Patterns:</h3>
                    <div className="text-xs text-blue-600 space-y-1">
                      {discoveryResults.patterns.map((pattern: string) => (
                        <div key={pattern} className="font-mono">{pattern}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table Details */}
            <div className="lg:col-span-2">
              {selectedTable && tableDetails ? (
                <div className="space-y-6">
                  {/* Table Info */}
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Table className="w-5 h-5" />
                        {selectedTable}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {tableDetails.rowCount} rows
                        </span>
                        <button
                          onClick={() => copyRxDBSchema(selectedTable)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Copy RxDB Schema
                        </button>
                      </div>
                    </div>

                    {/* Columns */}
                    {tableDetails.structure && (
                      <div>
                        <h3 className="font-semibold mb-2">Columns:</h3>
                        <div className="space-y-1">
                          {tableDetails.structure.columns.map((col: any) => (
                            <div key={col.column_name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                {col.is_primary && <Key className="w-4 h-4 text-yellow-500" />}
                                {col.foreign_key && <Link className="w-4 h-4 text-blue-500" />}
                                <span className="font-medium">{col.column_name}</span>
                              </div>
                              <span className="text-sm text-gray-600">{col.data_type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sample Data */}
                  {tableDetails.sampleData && tableDetails.sampleData.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="font-semibold mb-3">Sample Data:</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(tableDetails.sampleData[0]).map(key => (
                                <th key={key} className="px-2 py-1 text-left font-medium text-gray-700">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableDetails.sampleData.slice(0, 3).map((row: any, i: number) => (
                              <tr key={i} className="border-b">
                                {Object.values(row).map((value: any, j: number) => (
                                  <td key={j} className="px-2 py-1 text-gray-600">
                                    {value === null ? 'null' : 
                                     typeof value === 'object' ? JSON.stringify(value) :
                                     String(value).substring(0, 50)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* RxDB Schema Preview */}
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="font-semibold mb-3">Generated RxDB Schema:</h3>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(
                        tableDetails.structure ? generateRxDBSchema(tableDetails.structure) : {},
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-500">
                  {results ? 'Select a table to view details' : 'Click "Inspect Database" to start'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 How to use:</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Choose between Basic Mode (quick scan) or Advanced Mode (full discovery)</li>
            <li>2. Click "Inspect Database" or "Advanced Discovery" to scan tables</li>
            <li>3. Click on any table to see its structure and sample data</li>
            <li>4. Use "Copy RxDB Schema" to get the schema for RxDB collections</li>
            <li>5. Check the console for detailed logs and partition information</li>
            <li>6. Advanced Mode will discover all 800+ tables including partitions</li>
          </ol>
        </div>
        
        {discoveryResults && Object.keys(discoveryResults.partitionedTables).length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-3">📦 Partitioned Tables:</h3>
            <p className="text-sm text-yellow-800 mb-3">
              As per your preference, RxDB collections will be created only for main tables (~20 collections).
              Partitions will be handled through filtering at query time.
            </p>
            <div className="space-y-2">
              {Object.entries(discoveryResults.partitionedTables).map(([table, partitions]: [string, any]) => (
                <div key={table} className="text-sm">
                  <span className="font-semibold">{table}:</span> 
                  <span className="text-gray-600"> {Array.isArray(partitions) ? partitions.length : 'Multiple'} partitions</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}