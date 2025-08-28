import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { DatabasePage } from './pages/DatabasePage'
import { ConfigBuilderPage } from './pages/ConfigBuilderPage'
import { TemplatesPage } from './pages/TemplatesPage'
import FieldsConfigPage from './pages/FieldsConfigPage'
import { Database, Settings, FileJson, Home, Layers } from 'lucide-react'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <Link to="/" className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  Config Admin
                </Link>
                
                <div className="flex items-center gap-6">
                  <Link 
                    to="/" 
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link 
                    to="/fields" 
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    Fields Config
                  </Link>
                  <Link 
                    to="/database" 
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Database className="w-4 h-4" />
                    Database Schema
                  </Link>
                  <Link 
                    to="/builder" 
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Config Builder
                  </Link>
                  <Link 
                    to="/templates" 
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <FileJson className="w-4 h-4" />
                    Templates
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/fields" element={<FieldsConfigPage />} />
            <Route path="/database" element={<DatabasePage />} />
            <Route path="/builder" element={<ConfigBuilderPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Configuration Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link 
          to="/fields" 
          className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
        >
          <Layers className="w-12 h-12 mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Fields Configuration</h2>
          <p className="text-muted-foreground">
            Manage field definitions and their properties
          </p>
        </Link>

        <Link 
          to="/database" 
          className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
        >
          <Database className="w-12 h-12 mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Database Schema</h2>
          <p className="text-muted-foreground">
            Analyze and explore your Supabase database schema
          </p>
        </Link>
        
        <Link 
          to="/builder" 
          className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
        >
          <Settings className="w-12 h-12 mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Config Builder</h2>
          <p className="text-muted-foreground">
            Create and edit RxDB configurations visually
          </p>
        </Link>
        
        <Link 
          to="/templates" 
          className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
        >
          <FileJson className="w-12 h-12 mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Templates</h2>
          <p className="text-muted-foreground">
            Pre-built configuration templates for common patterns
          </p>
        </Link>
      </div>
    </div>
  )
}

export default App