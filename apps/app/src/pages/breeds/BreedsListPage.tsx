import React from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';
import { Plus } from 'lucide-react';

export function BreedsListPage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Breeds</h1>
          <p className="text-gray-600">Manage breed information and standards</p>
        </div>
        <Button onClick={() => navigateTo('/breeds/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Breed
        </Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Breeds Management</h3>
          <p className="text-gray-600 mt-2">This page will contain the breeds data table.</p>
        </div>
      </Card>
    </div>
  );
}