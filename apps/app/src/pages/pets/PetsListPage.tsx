import React from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';
import { PetDataTable } from '@/features/data-table/examples/PetDataTable';
import { useMockPets } from '@/core/api/mock.hooks';
import { type Pet } from '@/domain/entities/pet';
import { Download, Filter, Plus, Heart, CheckCircle, Users, ClipboardList } from 'lucide-react';

export function PetsListPage() {
  const { navigateTo } = useNavigationSync();
  const { data, isLoading, error } = useMockPets();
  const pets = data?.data || [];

  const handleEditPet = (pet: Pet) => {
    navigateTo(`/pets/${pet.id}/edit`);
  };

  const handleDeletePet = (pet: Pet) => {
    // TODO: Implement delete functionality
    console.log('Delete pet:', pet.id);
  };

  const handleViewPet = (pet: Pet) => {
    navigateTo(`/pets/${pet.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pets</h1>
          <p className="text-gray-600">Manage all pets in your breeding program</p>
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
          <Button onClick={() => navigateTo('/pets/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Pet
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
              <p className="text-sm font-medium text-gray-600">Total Pets</p>
              <p className="text-2xl font-bold text-gray-900">{pets.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {pets.filter(pet => pet.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Breeding</p>
              <p className="text-2xl font-bold text-gray-900">
                {pets.filter(pet => pet.breedingStatus === 'breeding').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClipboardList className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Health Tests</p>
              <p className="text-2xl font-bold text-gray-900">
                {pets.filter(pet => pet.healthTests && pet.healthTests.length > 0).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="p-6">
        <PetDataTable
          pets={pets}
          isLoading={isLoading}
          onEditPet={handleEditPet}
          onDeletePet={handleDeletePet}
          onViewPet={handleViewPet}
        />
      </Card>
    </div>
  );
}