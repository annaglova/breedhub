import React from 'react';
import { Button } from '@ui/components/button';
import { Avatar } from '@ui/components/avatar';
import { Badge } from '@ui/components/badge';
import { useAuth } from '@/core/auth';
import { useApp } from '@/store/hooks';
import { useNavigationSync } from '@/shared/hooks';

export function Header() {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar, notifications } = useApp();
  const { navigateTo } = useNavigationSync();

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

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
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          
          {/* Search */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
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
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="relative">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
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
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}