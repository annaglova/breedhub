import { Download, Copy, Eye, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface Template {
  id: string
  name: string
  description: string
  category: string
  schema: any
}

const templates: Template[] = [
  {
    id: 'user-profile',
    name: 'User Profile',
    description: 'Complete user profile with authentication fields',
    category: 'Authentication',
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        avatar: { type: 'string' },
        role: { type: 'string', default: 'user' },
        isActive: { type: 'boolean', default: true },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
      required: ['id', 'email', 'username'],
      indexes: [['email'], ['username']],
    },
  },
  {
    id: 'product-catalog',
    name: 'Product Catalog',
    description: 'E-commerce product with inventory tracking',
    category: 'E-commerce',
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string' },
        sku: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        currency: { type: 'string', default: 'USD' },
        stock: { type: 'number', default: 0 },
        category: { type: 'string' },
        images: { type: 'array', items: { type: 'string' } },
        isActive: { type: 'boolean', default: true },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
      required: ['id', 'sku', 'name', 'price'],
      indexes: [['sku'], ['category'], ['price']],
    },
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'Content management for blog articles',
    category: 'Content',
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string' },
        slug: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        excerpt: { type: 'string' },
        authorId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', default: 'draft' },
        publishedAt: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
      required: ['id', 'slug', 'title', 'content', 'authorId'],
      indexes: [['slug'], ['authorId'], ['status'], ['publishedAt']],
    },
  },
  {
    id: 'task-management',
    name: 'Task Management',
    description: 'Project tasks with assignment and tracking',
    category: 'Productivity',
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        assigneeId: { type: 'string' },
        projectId: { type: 'string' },
        status: { type: 'string', default: 'todo' },
        priority: { type: 'string', default: 'medium' },
        dueDate: { type: 'string' },
        completedAt: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
      required: ['id', 'title', 'assigneeId'],
      indexes: [['assigneeId'], ['projectId'], ['status'], ['dueDate']],
    },
  },
  {
    id: 'chat-message',
    name: 'Chat Message',
    description: 'Real-time messaging with read receipts',
    category: 'Communication',
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string' },
        conversationId: { type: 'string' },
        senderId: { type: 'string' },
        content: { type: 'string' },
        type: { type: 'string', default: 'text' },
        attachments: { type: 'array', items: { type: 'object' } },
        isRead: { type: 'boolean', default: false },
        isDeleted: { type: 'boolean', default: false },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
      required: ['id', 'conversationId', 'senderId', 'content'],
      indexes: [['conversationId'], ['senderId'], ['createdAt']],
      encrypted: ['content'],
    },
  },
  {
    id: 'inventory-item',
    name: 'Inventory Item',
    description: 'Warehouse inventory with location tracking',
    category: 'Logistics',
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string' },
        itemCode: { type: 'string' },
        name: { type: 'string' },
        quantity: { type: 'number' },
        unit: { type: 'string' },
        location: { type: 'string' },
        warehouseId: { type: 'string' },
        minStock: { type: 'number', default: 0 },
        maxStock: { type: 'number' },
        lastRestocked: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
      required: ['id', 'itemCode', 'name', 'quantity', 'warehouseId'],
      indexes: [['itemCode'], ['warehouseId'], ['location']],
    },
  },
]

const categories = Array.from(new Set(templates.map((t) => t.category)))

export function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates

  const downloadTemplate = (template: Template) => {
    const blob = new Blob([JSON.stringify(template.schema, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.id}-schema.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyTemplate = (template: Template) => {
    navigator.clipboard.writeText(JSON.stringify(template.schema, null, 2))
    alert('Schema copied to clipboard!')
  }

  const openInJsonHero = (template: Template) => {
    const jsonString = JSON.stringify(template.schema, null, 2)
    const encodedJson = btoa(unescape(encodeURIComponent(jsonString)))
    const url = `https://jsonhero.io/new?j=${encodedJson}`
    window.open(url, '_blank')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Schema Templates</h1>

      {/* Category Filter */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-muted'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-muted'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <div className="mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {template.category}
              </span>
              <h3 className="text-lg font-semibold">{template.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {template.description}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <div>Fields: {Object.keys(template.schema.properties).length}</div>
                <div>
                  Required: {template.schema.required?.length || 0}
                </div>
                <div>
                  Indexes: {template.schema.indexes?.length || 0}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(template)
                    setShowPreview(true)
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => openInJsonHero(template)}
                  className="p-2 border rounded-lg hover:bg-muted transition-colors"
                  title="Open in JSON Hero"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => copyTemplate(template)}
                  className="p-2 border rounded-lg hover:bg-muted transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => downloadTemplate(template)}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                  title="Download JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedTemplate.name} Schema</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(80vh-80px)]">
              <pre className="bg-muted p-4 rounded-lg text-sm">
                {JSON.stringify(selectedTemplate.schema, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}