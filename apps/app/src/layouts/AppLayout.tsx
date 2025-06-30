import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useApp } from '@/store/hooks';

export function AppLayout() {
  const { sidebarOpen } = useApp();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className={`transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        {/* Header */}
        <Header />
        
        {/* Page content */}
        <main className="p-4 pt-20">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => {/* Close sidebar logic */}}
        />
      )}
    </div>
  );
}