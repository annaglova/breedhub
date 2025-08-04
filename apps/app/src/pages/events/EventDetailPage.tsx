import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/events')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Event Details</h1>
            <p className="text-gray-600">View event information and participation details</p>
          </div>
        </div>
        <Button onClick={() => navigateTo(`/events/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Event
        </Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Event Detail View</h3>
          <p className="text-gray-600 mt-2">This page will display detailed event information including date, location, participants, results, and related documentation.</p>
          {id && <p className="text-sm text-gray-500 mt-4">Event ID: {id}</p>}
        </div>
      </Card>
    </div>
  );
}