import { useState, useEffect } from 'react';
import { Search, Filter, SortAsc, SortDesc, X } from 'lucide-react';
import {
  createSignalStore,
  withEntities,
  withFiltering,
  withFilteredEntities,
  withDebouncedSearch,
  createSelectors,
  type Entity,
  type FilterConfig
} from '@breedhub/signal-store';
import StateViewer from '../components/StateViewer';

interface Product extends Entity {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  rating: number;
  tags: string[];
}

// Create store with filtering
const useProductStore = createSignalStore<Product>('products', [
  withEntities<Product>(),
  withFiltering<Product>(),
  withFilteredEntities<Product>(),
  withDebouncedSearch<Product>(300),
]);

const productSelectors = createSelectors<Product>(useProductStore);

// Sample data
const generateProducts = (): Product[] => [
  { id: '1', name: 'Laptop Pro', category: 'Electronics', price: 1299, inStock: true, rating: 4.5, tags: ['premium', 'new'] },
  { id: '2', name: 'Wireless Mouse', category: 'Electronics', price: 29, inStock: true, rating: 4.2, tags: ['bestseller'] },
  { id: '3', name: 'Office Chair', category: 'Furniture', price: 349, inStock: false, rating: 4.8, tags: ['premium'] },
  { id: '4', name: 'Standing Desk', category: 'Furniture', price: 599, inStock: true, rating: 4.6, tags: ['new', 'eco'] },
  { id: '5', name: 'USB Cable', category: 'Electronics', price: 9, inStock: true, rating: 3.9, tags: [] },
  { id: '6', name: 'Monitor 4K', category: 'Electronics', price: 449, inStock: true, rating: 4.7, tags: ['premium', 'bestseller'] },
  { id: '7', name: 'Desk Lamp', category: 'Furniture', price: 79, inStock: false, rating: 4.1, tags: ['eco'] },
  { id: '8', name: 'Keyboard Mechanical', category: 'Electronics', price: 149, inStock: true, rating: 4.9, tags: ['premium', 'new'] },
];

export default function FilteringPage() {
  const store = useProductStore();
  const actions = productSelectors.useActions();
  const allProducts = productSelectors.useAllEntities();
  const filteredProducts = productSelectors.useFilteredEntities();
  const activeFilters = productSelectors.useActiveFilters();
  const searchQuery = productSelectors.useSearchQuery();

  const [priceRange, setPriceRange] = useState({ min: 0, max: 2000 });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  // Initialize products
  useEffect(() => {
    if (allProducts.length === 0) {
      actions.setAllEntities(generateProducts());
    }
  }, []);

  const handleSearch = (query: string) => {
    store.setDebouncedSearch?.(query);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    if (category) {
      actions.setFilter({
        field: 'category',
        operator: 'equals',
        value: category,
      });
    } else {
      actions.removeFilter('category');
    }
  };

  const handlePriceFilter = () => {
    actions.setFilter({
      field: 'price',
      operator: 'between',
      value: [priceRange.min, priceRange.max],
    });
  };

  const handleStockFilter = (inStockOnly: boolean) => {
    setShowInStockOnly(inStockOnly);
    if (inStockOnly) {
      actions.setFilter({
        field: 'inStock',
        operator: 'equals',
        value: true,
      });
    } else {
      actions.removeFilter('inStock');
    }
  };

  const handleSort = (field: keyof Product, order: 'asc' | 'desc') => {
    actions.setSortBy(field, order);
  };

  const categories = Array.from(new Set(allProducts.map(p => p.category)));

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Filtering & Search</h1>
        <p className="text-gray-600">
          Demonstrates filtering, searching, and sorting capabilities
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6">
          {/* Search */}
          <div className="card">
            <h3 className="font-semibold mb-3">Search</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="card">
            <h3 className="font-semibold mb-3">Category</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === ''}
                  onChange={() => handleCategoryFilter('')}
                  className="text-primary-600"
                />
                <span className="text-sm">All Categories</span>
              </label>
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat}
                    onChange={() => handleCategoryFilter(cat)}
                    className="text-primary-600"
                  />
                  <span className="text-sm">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="card">
            <h3 className="font-semibold mb-3">Price Range</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: +e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: +e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Max"
                />
              </div>
              <button
                onClick={handlePriceFilter}
                className="w-full btn btn-secondary text-sm"
              >
                Apply Price Filter
              </button>
            </div>
          </div>

          {/* Stock Filter */}
          <div className="card">
            <h3 className="font-semibold mb-3">Availability</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInStockOnly}
                onChange={(e) => handleStockFilter(e.target.checked)}
                className="text-primary-600 rounded"
              />
              <span className="text-sm">In Stock Only</span>
            </label>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              actions.clearFilters();
              setSelectedCategory('');
              setShowInStockOnly(false);
              setPriceRange({ min: 0, max: 2000 });
            }}
            className="w-full btn btn-secondary flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear All Filters
          </button>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Sorting Bar */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredProducts.length} of {allProducts.length} products
                {searchQuery && ` for "${searchQuery}"`}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <button
                  onClick={() => handleSort('price', 'asc')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Price: Low to High"
                >
                  <SortAsc className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSort('price', 'desc')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Price: High to Low"
                >
                  <SortDesc className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSort('rating', 'desc')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Rating
                </button>
                <button
                  onClick={() => handleSort('name', 'asc')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Name
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  <Filter className="w-3 h-3" />
                  {filter.field}: {Array.isArray(filter.value) ? filter.value.join('-') : String(filter.value)}
                  <button
                    onClick={() => actions.removeFilter(filter.field)}
                    className="ml-1 hover:text-primary-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="card hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{product.category}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-primary-600">${product.price}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">★</span>
                    <span className="text-sm">{product.rating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                  <div className="flex gap-1">
                    {product.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-gray-500">No products match your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* State Viewer */}
      <div className="mt-8">
        <StateViewer
          state={{
            filters: activeFilters,
            searchQuery,
            sortBy: store.sortBy,
            sortOrder: store.sortOrder,
            totalProducts: allProducts.length,
            filteredCount: filteredProducts.length,
          }}
          title="Filter State"
        />
      </div>
    </div>
  );
}