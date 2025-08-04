import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';

export function ContactCreatePage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/contacts')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Contact</h1>
            <p className="text-gray-600">Add a new contact to your breeding network</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Contact Creation Form</h3>
          <p className="text-gray-600 mt-2">This page will contain the contact creation form with fields for name, contact information, professional role, and relationship details.</p>
        </div>
      </Card>
    </div>
  );
}