import React from 'react';
import { Button } from '@ui/components/button';
import { Avatar } from '@ui/components/avatar';
import { Badge } from '@ui/components/badge';
import { useAuth } from '@/core/auth';
import { useApp } from '@/store/hooks';
import { useNavigationSync } from '@/shared/hooks';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, LogIn } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar, notifications } = useApp();
  const { navigateTo } = useNavigationSync();
  const location = useLocation();
  
  // Public routes that don't need auth
  const publicRoutes = ['/breeds', '/pets', '/kennels'];
  const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));

  const unreadNotifications = notifications?.length || 0;

  return (
    <header className="fixed top-0 right-0 left-0 z-30 bg-white border-b border-gray-200 h-16">
      <div className={`flex items-center justify-between h-full px-4 transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Search */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search pets, breeds, kennels..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {/* Notifications */}
              <div className="relative">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* User menu */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <div className="hidden md:block text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.user_metadata?.full_name || user?.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.user_metadata?.role || 'Breeder'}
                    </div>
                  </div>
                  
                  <Avatar className="h-8 w-8">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="User avatar" />
                    ) : (
                      <div className="flex items-center justify-center bg-indigo-500 text-white">
                        {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </Avatar>
                  
                  {/* Dropdown menu trigger */}
                  <Button variant="ghost" size="sm">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Public navigation links */}
              <Button variant="ghost" onClick={() => navigateTo('/breeds')}>
                Breeds
              </Button>
              <Button variant="ghost" onClick={() => navigateTo('/pets')}>
                Pets
              </Button>
              <Button variant="ghost" onClick={() => navigateTo('/kennels')}>
                Kennels
              </Button>
              <Button onClick={() => navigateTo('/auth/login')}>
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}