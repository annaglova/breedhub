import React from 'react';
import { Button, Card } from 'ui';
import { useNavigationSync } from '@/shared/hooks';

export function ProfilePage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/dashboard')}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600">Manage your personal information and breeding profile</p>
          </div>
        </div>
        <Button onClick={() => navigateTo('/settings')}>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
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