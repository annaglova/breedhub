import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';

export function KennelsListPage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kennels</h1>
          <p className="text-gray-600">Manage kennel information and breeding facilities</p>
        </div>
        <Button onClick={() => navigateTo('/kennels/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Kennel
        </Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Kennels Management</h3>
          <p className="text-gray-600 mt-2">This page will contain the kennels data table with information about registered kennels, their owners, and breeding activities.</p>
        </div>
      </Card>
    </div>
  );
}