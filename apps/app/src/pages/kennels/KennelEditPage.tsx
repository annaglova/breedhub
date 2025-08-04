import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';

export function KennelEditPage() {
  const { id } = useParams<{ id: string }>();
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo(`/kennels/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Kennel</h1>
            <p className="text-gray-600">Update kennel information and registration details</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Kennel Edit Form</h3>
          <p className="text-gray-600 mt-2">This page will contain the kennel editing form with fields for registration details, owner information, facilities, and contact details.</p>
          {id && <p className="text-sm text-gray-500 mt-4">Editing Kennel ID: {id}</p>}
        </div>
      </Card>
    </div>
  );
}