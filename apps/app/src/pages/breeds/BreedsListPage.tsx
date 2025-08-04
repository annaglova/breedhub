import React from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';
import { BreedDataTable } from '@/features/data-table/examples/BreedDataTable';
import { useMockBreeds } from '@/core/api/mock.hooks';
import { type Breed } from '@/domain/entities/breed';
import { Download, Filter, Plus, Dog, Cat, Heart, TrendingUp } from 'lucide-react';

export function BreedsListPage() {
  const { navigateTo } = useNavigationSync();
  const { data, isLoading, error } = useMockBreeds();
  const breeds = data?.data || [];

  const handleEditBreed = (breed: Breed) => {
    navigateTo(`/breeds/${breed.id}/edit`);
  };

  const handleDeleteBreed = (breed: Breed) => {
    // TODO: Implement delete functionality
    console.log('Delete breed:', breed.id);
  };

  const handleViewBreed = (breed: Breed) => {
    navigateTo(`/breeds/${breed.id}`);
  };

  // Calculate statistics
  const dogBreeds = breeds.filter(b => b.pet_type_id === 'dog').length;
  const catBreeds = breeds.filter(b => b.pet_type_id === 'cat').length;
  const totalRegistrations = breeds.reduce((sum, b) => sum + (b.registration_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Breeds</h1>
          <p className="text-gray-600">Manage breed information and standards</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button onClick={() => navigateTo('/breeds/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Breed
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Heart className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Breeds</p>
              <p className="text-2xl font-bold text-gray-900">{breeds.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Dog className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Dog Breeds</p>
              <p className="text-2xl font-bold text-gray-900">{dogBreeds}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Cat className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cat Breeds</p>
              <p className="text-2xl font-bold text-gray-900">{catBreeds}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Registrations</p>
              <p className="text-2xl font-bold text-gray-900">{totalRegistrations}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="p-6">
        <BreedDataTable
          breeds={breeds}
          isLoading={isLoading}
          onEditBreed={handleEditBreed}
          onDeleteBreed={handleDeleteBreed}
          onViewBreed={handleViewBreed}
        />
      </Card>
    </div>
  );
}