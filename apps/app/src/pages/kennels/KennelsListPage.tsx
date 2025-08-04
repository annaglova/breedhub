import React from 'react';
import { Plus, Download, Filter, Home, Award, Globe, Star } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';
// Removed KennelDataTable - will be replaced with card-based layout
import { useMockKennels } from '@/core/api/mock.hooks';
import { type Kennel } from '@/domain/entities/kennel';

export function KennelsListPage() {
  const { navigateTo } = useNavigationSync();
  const { data, isLoading, error } = useMockKennels();
  const kennels = data?.data || [];

  const handleEditKennel = (kennel: Kennel) => {
    navigateTo(`/kennels/${kennel.id}/edit`);
  };

  const handleDeleteKennel = (kennel: Kennel) => {
    // TODO: Implement delete functionality
    console.log('Delete kennel:', kennel.id);
  };

  const handleViewKennel = (kennel: Kennel) => {
    navigateTo(`/kennels/${kennel.id}`);
  };

  // Calculate statistics
  const verifiedKennels = kennels.filter(k => k.is_verified).length;
  const countries = new Set(kennels.map(k => k.country_id)).size;
  const highRatedKennels = kennels.filter(k => (k.rating || 0) >= 90).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kennels</h1>
          <p className="text-gray-600">Manage kennel information and breeding facilities</p>
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
          <Button onClick={() => navigateTo('/kennels/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Kennel
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Home className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Kennels</p>
              <p className="text-2xl font-bold text-gray-900">{kennels.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">{verifiedKennels}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Globe className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-2xl font-bold text-gray-900">{countries}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Star className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Rated</p>
              <p className="text-2xl font-bold text-gray-900">{highRatedKennels}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Kennel Cards - TODO: Create card-based layout */}
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Kennel cards will be implemented here</p>
        </div>
      </Card>
    </div>
  );
}