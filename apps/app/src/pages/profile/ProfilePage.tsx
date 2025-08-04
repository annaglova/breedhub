import React from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';

export function ProfilePage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600">Manage your personal information and breeding profile</p>
          </div>
        </div>
        <Button onClick={() => navigateTo('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              <p className="text-gray-600 mt-2">This section will contain user profile information including personal details, breeding experience, specializations, and contact information.</p>
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900">Profile Statistics</h3>
              <p className="text-gray-600 mt-2">This section will show breeding statistics, achievements, and activity metrics.</p>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              <p className="text-gray-600 mt-2">This section will display recent breeding activities and updates.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}