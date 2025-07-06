import React from 'react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { useNavigationSync } from '@/shared/hooks';

export function SettingsPage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/profile')}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
            <p className="text-gray-600 mt-2">This section will contain account settings including password change, email preferences, and security options.</p>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Application Preferences</h3>
            <p className="text-gray-600 mt-2">This section will contain application preferences including theme, language, notifications, and display options.</p>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
            <p className="text-gray-600 mt-2">This section will contain privacy settings including data sharing preferences and profile visibility options.</p>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Export & Backup</h3>
            <p className="text-gray-600 mt-2">This section will contain options for exporting data and creating backups of breeding records.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}