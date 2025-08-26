import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Database, Table, Columns, Key, Link, RefreshCw, AlertCircle, ExternalLink, Download } from 'lucide-react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

interface TableColumn {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  is_primary: boolean
}

interface TableInfo {
  table_name: string
  columns: TableColumn[]
  row_count?: number
}

export function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  const knownTables = [
    {
      name: 'books',
      columns: [
        { name: 'id', type: 'uuid', primary: true },
        { name: 'title', type: 'text' },
        { name: 'author', type: 'text' },
        { name: 'isbn', type: 'text' },
        { name: 'genre', type: 'text' },
        { name: 'published_year', type: 'integer' },
        { name: 'pages', type: 'integer' },
        { name: 'rating', type: 'numeric' },
        { name: 'description', type: 'text' },
        { name: 'available', type: 'boolean' },
        { name: 'created_at', type: 'timestamp' },
        { name: 'updated_at', type: 'timestamp' },
        { name: 'deleted', type: 'boolean' },
      ]
    },
    {
      name: 'breed',
      columns: [
        { name: 'id', type: 'uuid', primary: true },
        { name: 'name', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'created_at', type: 'timestamp' },
        { name: 'updated_at', type: 'timestamp' },
        { name: 'deleted', type: 'boolean' },
      ]
    }
  ]

  const fetchDatabaseSchema = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      
      // Try to fetch actual row counts for known tables
      const tableInfoPromises = knownTables.map(async (table) => {
        try {
          const { count } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true })
          
          return {
            table_name: table.name,
            columns: table.columns.map(col => ({
              column_name: col.name,
              data_type: col.type,
              is_nullable: col.name === 'id' || col.name.includes('_at') ? 'NO' : 'YES',
              column_default: col.name.includes('_at') ? 'now()' : 
                              col.type === 'boolean' ? 'false' : null,
              is_primary: col.primary || false,
            })),
            row_count: count || 0,
          }
        } catch (err) {
          console.error(`Error fetching ${table.name}:`, err)
          return {
            table_name: table.name,
            columns: table.columns.map(col => ({
              column_name: col.name,
              data_type: col.type,
              is_nullable: 'YES',
              column_default: null,
              is_primary: col.primary || false,
            })),
            row_count: 0,
          }
        }
      })

      const tableInfo = await Promise.all(tableInfoPromises)
      setTables(tableInfo)
    } catch (err: any) {
      console.error('Error fetching schema:', err)
      setError(err.message || 'Failed to fetch database schema')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      fetchDatabaseSchema()
    } else {
      setError('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
    }
  }, [])

  const getDataTypeIcon = (dataType: string) => {
    if (dataType.includes('int') || dataType.includes('numeric')) return '🔢'
    if (dataType.includes('text') || dataType.includes('varchar')) return '📝'
    if (dataType.includes('bool')) return '✓'
    if (dataType.includes('timestamp') || dataType.includes('date')) return '📅'
    if (dataType.includes('uuid')) return '🔑'
    if (dataType.includes('json')) return '{}'
    return '📦'
  }

  const generateRxDBConfig = (table: TableInfo) => {
    const properties: any = {}
    const required: string[] = []

    table.columns.forEach((col) => {
      let type = 'string'
      if (col.data_type.includes('int') || col.data_type.includes('numeric')) {
        type = 'number'
      } else if (col.data_type.includes('bool')) {
        type = 'boolean'
      } else if (col.data_type.includes('json')) {
        type = 'object'
      }

      properties[col.column_name] = { type }

      if (col.is_nullable === 'NO') {
        required.push(col.column_name)
      }
    })

    const primaryKey = table.columns.find(col => col.is_primary)?.column_name || 'id'

    return {
      version: 0,
      primaryKey,
      type: 'object',
      properties,
      required,
    }
  }

  const exportTableConfig = (table: TableInfo) => {
    const config = generateRxDBConfig(table)
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${table.table_name}-rxdb-config.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openInJsonHero = (table: TableInfo) => {
    const config = generateRxDBConfig(table)
    const jsonString = JSON.stringify(config, null, 2)
    const encodedJson = btoa(unescape(encodeURIComponent(jsonString)))
    const url = `https://jsonhero.io/new?j=${encodedJson}`
    window.open(url, '_blank')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8" />
          Database Schema Analyzer
        </h1>
        <button
          onClick={fetchDatabaseSchema}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!supabaseUrl && (
        <div className="mb-6 p-4 border border-yellow-500 bg-yellow-50 text-yellow-900 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">Configuration Required</p>
            <p className="text-sm">
              Please add your Supabase credentials to the .env file:
            </p>
            <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs">
              VITE_SUPABASE_URL=your-project-url{'\n'}
              VITE_SUPABASE_ANON_KEY=your-anon-key
            </pre>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 border border-destructive bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {loading && !error ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading database schema...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tables List */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Table className="w-5 h-5" />
              Tables ({tables.length})
            </h2>
            <div className="space-y-2">
              {tables.map((table) => (
                <button
                  key={table.table_name}
                  onClick={() => setSelectedTable(table.table_name)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTable === table.table_name
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{table.table_name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{table.columns.length} cols</span>
                      {table.row_count !== undefined && (
                        <span>• {table.row_count} rows</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Table Details */}
          <div className="lg:col-span-2">
            {selectedTable ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Columns className="w-5 h-5" />
                    {selectedTable} Schema
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const table = tables.find(t => t.table_name === selectedTable)
                        if (table) openInJsonHero(table)
                      }}
                      className="px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      JSON Hero
                    </button>
                    <button
                      onClick={() => {
                        const table = tables.find(t => t.table_name === selectedTable)
                        if (table) exportTableConfig(table)
                      }}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden mb-4">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Column</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Nullable</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Default</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Keys</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tables
                        .find((t) => t.table_name === selectedTable)
                        ?.columns.map((column, index) => (
                          <tr
                            key={column.column_name}
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                          >
                            <td className="px-4 py-3 font-mono text-sm">
                              {column.column_name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="flex items-center gap-1">
                                <span>{getDataTypeIcon(column.data_type)}</span>
                                <span className="font-mono">{column.data_type}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {column.is_nullable === 'YES' ? (
                                <span className="text-muted-foreground">Yes</span>
                              ) : (
                                <span className="font-medium">No</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                              {column.column_default || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {column.is_primary && (
                                <span className="flex items-center gap-1 text-yellow-600">
                                  <Key className="w-3 h-3" />
                                  PK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* RxDB Config Preview */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">RxDB Configuration Preview</h3>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-64">
                    {JSON.stringify(
                      generateRxDBConfig(tables.find(t => t.table_name === selectedTable)!),
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Table className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a table to view its schema</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}