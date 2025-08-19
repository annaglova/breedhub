import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Database, Filter, GitBranch, HardDrive, Activity, Layers, Code, Boxes, FlaskConical, Zap, Disc, Smartphone, WifiOff, RefreshCw, ClipboardCheck } from 'lucide-react';
import HomePage from './pages/HomePage';
import EntitiesPage from './pages/EntitiesPage';
import FilteringPage from './pages/FilteringPage';
import HierarchyPage from './pages/HierarchyPage';
import SyncPage from './pages/SyncPage';
import PerformancePage from './pages/PerformancePage';
import CompositionPage from './pages/CompositionPage';
import ExamplesPage from './pages/ExamplesPage';
import MultiStorePage from './pages/MultiStorePage';
import TestPage from './pages/TestPage';
import SimpleTestPage from './pages/SimpleTestPage';
import AdvancedTestPage from './pages/AdvancedTestPage';
import RxDBPage from './pages/RxDBPage';
import PWATestPage from './pages/PWATestPage';
import OfflineDataPage from './pages/OfflineDataPage';
import BackgroundSyncTest from './pages/BackgroundSyncTest';
import PWATestGuide from './pages/PWATestGuide';
import { SWRegisterButton } from './components/SWRegisterButton';
import clsx from 'clsx';

const navigation = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'RxDB Demo', path: '/rxdb', icon: Disc },
  { name: 'PWA Test', path: '/pwa', icon: Smartphone },
  { name: 'PWA Guide', path: '/pwa-guide', icon: ClipboardCheck },
  { name: 'Offline Data', path: '/offline-data', icon: WifiOff },
  { name: 'Background Sync', path: '/background-sync', icon: RefreshCw },
  { name: 'Test', path: '/test', icon: FlaskConical },
  { name: 'Advanced Test', path: '/advanced-test', icon: Zap },
  { name: 'MultiStore', path: '/multistore', icon: Boxes },
  { name: 'Entities', path: '/entities', icon: Database },
  { name: 'Filtering', path: '/filtering', icon: Filter },
  { name: 'Hierarchy', path: '/hierarchy', icon: GitBranch },
  { name: 'Sync', path: '/sync', icon: HardDrive },
  { name: 'Composition', path: '/composition', icon: Layers },
  { name: 'Performance', path: '/performance', icon: Activity },
  { name: 'Examples', path: '/examples', icon: Code },
];

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      {/* Service Worker Register Button */}
      <SWRegisterButton />
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary-600">SignalStore</h1>
          <p className="text-sm text-gray-500 mt-1">Playground</p>
        </div>
        
        <nav className="px-4 pb-6">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rxdb" element={<RxDBPage />} />
          <Route path="/pwa" element={<PWATestPage />} />
          <Route path="/pwa-guide" element={<PWATestGuide />} />
          <Route path="/offline-data" element={<OfflineDataPage />} />
          <Route path="/background-sync" element={<BackgroundSyncTest />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/simple-test" element={<SimpleTestPage />} />
          <Route path="/advanced-test" element={<AdvancedTestPage />} />
          <Route path="/multistore" element={<MultiStorePage />} />
          <Route path="/entities" element={<EntitiesPage />} />
          <Route path="/filtering" element={<FilteringPage />} />
          <Route path="/hierarchy" element={<HierarchyPage />} />
          <Route path="/sync" element={<SyncPage />} />
          <Route path="/composition" element={<CompositionPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/examples" element={<ExamplesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;