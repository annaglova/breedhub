import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Properties from './pages/Properties'
import Templates from './pages/Templates'
import AppConfig from './pages/AppConfig'
import { Settings, Tag, Database, FileText, Package } from 'lucide-react'

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="flex gap-4">
      <Link 
        to="/" 
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
          location.pathname === '/' 
            ? 'bg-blue-50 text-blue-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Tag className="w-4 h-4" />
        Properties
      </Link>
      <Link 
        to="/templates" 
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
          location.pathname === '/templates' 
            ? 'bg-blue-50 text-blue-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <FileText className="w-4 h-4" />
        Templates
      </Link>
      <Link 
        to="/app-config" 
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
          location.pathname === '/app-config' 
            ? 'bg-blue-50 text-blue-600' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Package className="w-4 h-4" />
        App Config
      </Link>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold">Config Admin</h1>
              </div>
              <Navigation />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Properties />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/app-config" element={<AppConfig />} />
            <Route path="*" element={<Properties />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App