import React from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';
import { ArrowLeft } from 'lucide-react';

export function PetCreatePage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/pets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Pet</h1>
            <p className="text-gray-600">Register a new pet in your breeding program</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Pet Creation Form</h3>
          <p className="text-gray-600 mt-2">This page will contain the pet creation form.</p>
        </div>
      </Card>
    </div>
  );
}