import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';

export function LittersListPage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Litters</h1>
          <p className="text-gray-600">Manage breeding litters and offspring records</p>
        </div>
        <Button onClick={() => navigateTo('/litters/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Litter
        </Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Litters Management</h3>
          <p className="text-gray-600 mt-2">This page will contain the litters data table with information about breeding records, offspring, and litter details.</p>
        </div>
      </Card>
    </div>
  );
}