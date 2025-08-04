import React from 'react';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@ui/components/button';
import { useNavigationSync } from '@/shared/hooks';

export function NotFoundPage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <AlertCircle className="mx-auto h-24 w-24 text-gray-400" />
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, 
            deleted, or the URL might be incorrect.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            onClick={() => navigateTo('/dashboard')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>

          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Help Links */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Need help? Try these popular pages:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <button 
              onClick={() => navigateTo('/pets')}
              className="text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Pets
            </button>
            <button 
              onClick={() => navigateTo('/breeds')}
              className="text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Breeds
            </button>
            <button 
              onClick={() => navigateTo('/litters')}
              className="text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Litters
            </button>
            <button 
              onClick={() => navigateTo('/kennels')}
              className="text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Kennels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}