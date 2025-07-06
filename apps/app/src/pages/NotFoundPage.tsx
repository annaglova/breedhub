import React from 'react';
import { Button } from '@ui/components/button';
import { useNavigationSync } from '@/shared/hooks';

export function NotFoundPage() {
  const { navigateTo } = useNavigationSync();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <svg
            className="mx-auto h-24 w-24 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.467.901-6.062 2.379L8 19.5V21a2 2 0 002 2h4a2 2 0 002-2v-1.5l2.062-2.121z"
            />
          </svg>
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
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Dashboard
          </Button>

          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
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