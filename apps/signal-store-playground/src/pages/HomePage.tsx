import { CheckCircle, Code, Zap, Database, GitBranch, HardDrive } from 'lucide-react';

const features = [
  {
    icon: Database,
    title: 'Entity Management',
    description: 'Full CRUD operations with selection and batch updates',
  },
  {
    icon: Zap,
    title: 'Optimistic Updates',
    description: 'Instant UI updates with automatic rollback on errors',
  },
  {
    icon: GitBranch,
    title: 'Hierarchical Stores',
    description: 'Parent-child store relationships with state inheritance',
  },
  {
    icon: HardDrive,
    title: 'IndexedDB Sync',
    description: 'Offline-first data persistence with conflict resolution',
  },
];

export default function HomePage() {
  return (
    <div className="p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          React SignalStore Playground
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl">
          Interactive playground for testing and exploring SignalStore - 
          a fractal state management solution inspired by NgRx SignalStore, 
          adapted for React with IndexedDB support.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="card flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Getting Started</h2>
        <div className="card">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Explore the navigation menu</p>
                <p className="text-sm text-gray-600">Each page demonstrates different SignalStore features</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Try the interactive examples</p>
                <p className="text-sm text-gray-600">Modify data and see real-time state updates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Check the code samples</p>
                <p className="text-sm text-gray-600">Each example includes the implementation code</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Quick Example</h2>
        <div className="card bg-gray-900 text-gray-100">
          <pre className="overflow-x-auto">
            <code>{`import { createSignalStore, withEntities, withFiltering } from '@breedhub/signal-store';

// Create a store with features
const useProductStore = createSignalStore('products', [
  withEntities(),
  withFiltering(),
  withRequestStatus(),
]);

// Use in component
function ProductList() {
  const store = useProductStore();
  const products = store.computed.filteredEntities;
  
  return (
    <div>
      {products.map(p => <ProductCard key={p.id} {...p} />)}
    </div>
  );
}`}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}