import { useState } from 'react'
import { Save, Download, Upload, Plus, Trash2, Copy } from 'lucide-react'

interface FieldConfig {
  name: string
  type: string
  required: boolean
  indexed: boolean
  encrypted: boolean
  maxLength?: number
  default?: any
}

interface CollectionConfig {
  name: string
  version: number
  primaryKey: string
  fields: FieldConfig[]
  indexes: string[][]
  encrypted: string[]
  sync: {
    enabled: boolean
    interval: number
  }
}

export function ConfigBuilderPage() {
  const [config, setConfig] = useState<CollectionConfig>({
    name: '',
    version: 0,
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'string', required: true, indexed: true, encrypted: false },
    ],
    indexes: [],
    encrypted: [],
    sync: {
      enabled: true,
      interval: 10000,
    },
  })

  const [showJson, setShowJson] = useState(false)

  const fieldTypes = [
    'string',
    'number',
    'boolean',
    'object',
    'array',
    'date',
    'uuid',
  ]

  const addField = () => {
    setConfig({
      ...config,
      fields: [
        ...config.fields,
        {
          name: `field_${config.fields.length}`,
          type: 'string',
          required: false,
          indexed: false,
          encrypted: false,
        },
      ],
    })
  }

  const updateField = (index: number, field: Partial<FieldConfig>) => {
    const newFields = [...config.fields]
    newFields[index] = { ...newFields[index], ...field }
    setConfig({ ...config, fields: newFields })
  }

  const removeField = (index: number) => {
    if (config.fields[index].name === config.primaryKey) {
      alert('Cannot remove primary key field')
      return
    }
    const newFields = config.fields.filter((_, i) => i !== index)
    setConfig({ ...config, fields: newFields })
  }

  const generateRxDBSchema = () => {
    const properties: any = {}
    const required: string[] = []
    const encrypted: string[] = []

    config.fields.forEach((field) => {
      const prop: any = { type: field.type }
      
      if (field.maxLength) {
        prop.maxLength = field.maxLength
      }
      
      if (field.default !== undefined) {
        prop.default = field.default
      }

      properties[field.name] = prop

      if (field.required) {
        required.push(field.name)
      }

      if (field.encrypted) {
        encrypted.push(field.name)
      }
    })

    return {
      version: config.version,
      primaryKey: config.primaryKey,
      type: 'object',
      properties,
      required,
      encrypted: encrypted.length > 0 ? encrypted : undefined,
      indexes: config.indexes.length > 0 ? config.indexes : undefined,
    }
  }

  const exportConfig = () => {
    const schema = generateRxDBSchema()
    const blob = new Blob([JSON.stringify(schema, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.name || 'collection'}-schema.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        // Parse imported schema back to our config format
        const fields: FieldConfig[] = Object.entries(imported.properties || {}).map(
          ([name, prop]: [string, any]) => ({
            name,
            type: prop.type || 'string',
            required: imported.required?.includes(name) || false,
            indexed: false, // Would need to parse from indexes
            encrypted: imported.encrypted?.includes(name) || false,
            maxLength: prop.maxLength,
            default: prop.default,
          })
        )

        setConfig({
          name: '',
          version: imported.version || 0,
          primaryKey: imported.primaryKey || 'id',
          fields,
          indexes: imported.indexes || [],
          encrypted: imported.encrypted || [],
          sync: {
            enabled: true,
            interval: 10000,
          },
        })
      } catch (error) {
        alert('Failed to import configuration')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Visual Config Builder</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJson(!showJson)}
            className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            {showJson ? 'Hide' : 'Show'} JSON
          </button>
          <label className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={importConfig}
              className="hidden"
            />
          </label>
          <button
            onClick={exportConfig}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Collection Name</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., users, products"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Version</label>
                  <input
                    type="number"
                    value={config.version}
                    onChange={(e) => setConfig({ ...config, version: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Primary Key</label>
                  <select
                    value={config.primaryKey}
                    onChange={(e) => setConfig({ ...config, primaryKey: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {config.fields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Fields</h2>
              <button
                onClick={addField}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Field
              </button>
            </div>
            <div className="space-y-3">
              {config.fields.map((field, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                      className="px-3 py-2 border rounded-lg"
                      placeholder="Field name"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value })}
                      className="px-3 py-2 border rounded-lg"
                    >
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                        />
                        Required
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.indexed}
                          onChange={(e) => updateField(index, { indexed: e.target.checked })}
                        />
                        Indexed
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.encrypted}
                          onChange={(e) => updateField(index, { encrypted: e.target.checked })}
                        />
                        Encrypted
                      </label>
                    </div>
                    <button
                      onClick={() => removeField(index)}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sync Settings */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Synchronization</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.sync.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sync: { ...config.sync, enabled: e.target.checked },
                    })
                  }
                />
                Enable synchronization
              </label>
              {config.sync.enabled && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sync Interval (ms)
                  </label>
                  <input
                    type="number"
                    value={config.sync.interval}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sync: { ...config.sync, interval: parseInt(e.target.value) || 10000 },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="border rounded-lg p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Schema Preview</h2>
              <button
                onClick={() => {
                  const schema = generateRxDBSchema()
                  navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
                  alert('Schema copied to clipboard!')
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-sm">
              {JSON.stringify(generateRxDBSchema(), null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}