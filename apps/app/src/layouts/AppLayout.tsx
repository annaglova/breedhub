import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useApp } from '@/store/hooks';
import { useAuth } from '@/core/auth';

export function AppLayout() {
  const { sidebarOpen } = useApp();
  const { user } = useAuth();
  const location = useLocation();
  
  // Public routes that don't need auth
  const publicRoutes = ['/breeds', '/pets', '/kennels'];
  const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - only show for authenticated users or if not on public route */}
      {(!isPublicRoute || user) && <Sidebar />}
      
      {/* Main content */}
      <div className={`transition-all duration-300 ${
        (!isPublicRoute || user) ? (sidebarOpen ? 'lg:ml-64' : 'lg:ml-16') : ''
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
      {sidebarOpen && (!isPublicRoute || user) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => {/* Close sidebar logic */}}
        />
      )}
    </div>
  );
}