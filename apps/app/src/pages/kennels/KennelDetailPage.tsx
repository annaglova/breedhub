import React from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card } from 'ui';
import { useNavigationSync } from '@/shared/hooks';

export function KennelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/kennels')}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kennel Details</h1>
            <p className="text-gray-600">View kennel information and breeding activities</p>
          </div>
        </div>
        <Button onClick={() => navigateTo(`/kennels/${id}/edit`)}>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Kennel
        </Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Kennel Detail View</h3>
          <p className="text-gray-600 mt-2">This page will display detailed kennel information including registration details, owner information, facilities, and breeding history.</p>
          {id && <p className="text-sm text-gray-500 mt-4">Kennel ID: {id}</p>}
        </div>
      </Card>
    </div>
  );
}