import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Properties from './pages/Properties'
import { Settings } from 'lucide-react'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold">Config Admin</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/" element={<Properties />} />
            <Route path="*" element={<Properties />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App