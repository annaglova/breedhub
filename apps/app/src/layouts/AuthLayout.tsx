import React from 'react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-100">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">BreedHub</h1>
            <p className="text-gray-600 mt-2">Manage your breeding program</p>
          </div>
          
          {/* Auth form content */}
          <Outlet />
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>&copy; 2025 BreedHub. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}