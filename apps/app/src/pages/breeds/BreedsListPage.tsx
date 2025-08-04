import React, { useState, useMemo } from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';
import { useMockBreeds } from '@/core/api/mock.hooks';
import { type Breed } from '@/domain/entities/breed';
import { BreedListCard } from '@/features/breeds/components/BreedListCard';
import { BreedFilters } from '@/features/breeds/components/BreedFilters';
import { Download, Plus, LayoutGrid, List } from 'lucide-react';

export function BreedsListPage() {
  const { navigateTo } = useNavigationSync();
  const { data, isLoading, error } = useMockBreeds();
  const breeds = data?.data || [];
  const [selectedBreedId, setSelectedBreedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [filters, setFilters] = useState({
    search: '',
    petType: 'all' as 'all' | 'dog' | 'cat',
    hasPhotos: false,
    hasPatrons: false,
  });

  // Filter breeds based on current filters
  const filteredBreeds = useMemo(() => {
    return breeds.filter(breed => {
      // Search filter
      if (filters.search && !breed.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Pet type filter
      if (filters.petType !== 'all' && breed.pet_type_id !== filters.petType) {
        return false;
      }
      
      // Has photos filter
      if (filters.hasPhotos && !breed.photo_url) {
        return false;
      }
      
      // Has patrons filter (mock logic)
      if (filters.hasPatrons && Math.random() < 0.5) {
        return false;
      }
      
      return true;
    });
  }, [breeds, filters]);

  const handleBreedClick = (breed: Breed) => {
    navigateTo(`/breeds/${breed.id}`);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      petType: 'all',
      hasPhotos: false,
      hasPatrons: false,
    });
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters */}
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <BreedFilters 
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Breeds</h1>
            <p className="text-muted-foreground">Browse and manage breed information</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => navigateTo('/breeds/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Breed
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredBreeds.length} of {breeds.length} breeds
        </div>

        {/* Breed Cards Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading breeds...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-8">
            <div className="text-center space-y-2">
              <p className="text-destructive">Error loading breeds</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </Card>
        ) : filteredBreeds.length === 0 ? (
          <Card className="p-8">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No breeds found</p>
              <p className="text-muted-foreground">Try adjusting your filters or add a new breed</p>
              <Button className="mt-4" onClick={() => navigateTo('/breeds/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Breed
              </Button>
            </div>
          </Card>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" 
            : "space-y-3"
          }>
            {filteredBreeds.map((breed) => (
              <BreedListCard
                key={breed.id}
                breed={breed}
                selected={breed.id === selectedBreedId}
                onClick={() => handleBreedClick(breed)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}