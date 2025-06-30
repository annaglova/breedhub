import React from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from 'ui';
import { useApp } from '@/store/hooks';
import { cn } from '@/shared/utils';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  collapsed?: boolean;
}

function SidebarItem({ to, icon, label, badge, collapsed }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
          isActive
            ? 'bg-indigo-100 text-indigo-700 border-r-2 border-indigo-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          collapsed && 'justify-center'
        )
      }
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icon}
        </div>
        {!collapsed && (
          <>
            <span className="ml-3">{label}</span>
            {badge && (
              <span className="ml-auto bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                {badge}
              </span>
            )}
          </>
        )}
      </div>
    </NavLink>
  );
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useApp();

  const navigationItems = [
    {
      to: '/dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
      label: 'Dashboard',
    },
    {
      to: '/pets',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      label: 'Pets',
    },
    {
      to: '/breeds',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      label: 'Breeds',
    },
    {
      to: '/litters',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: 'Litters',
    },
    {
      to: '/kennels',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      label: 'Kennels',
    },
    {
      to: '/contacts',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      label: 'Contacts',
    },
    {
      to: '/events',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Events',
    },
  ];

  const bottomItems = [
    {
      to: '/profile',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: 'Profile',
    },
    {
      to: '/settings',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Settings',
    },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16',
        'hidden lg:flex lg:flex-col'
      )}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
            </div>
            {sidebarOpen && (
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">BreedHub</h1>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={!sidebarOpen}
            />
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="px-3 py-4 border-t border-gray-200 space-y-1">
          {bottomItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={!sidebarOpen}
            />
          ))}
        </div>

        {/* Collapse button */}
        <div className="px-3 py-4 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn('w-full', !sidebarOpen && 'justify-center')}
          >
            <svg 
              className={cn('h-5 w-5 transition-transform', sidebarOpen && 'rotate-180')} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {sidebarOpen && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <h1 className="ml-3 text-xl font-bold text-gray-900">BreedHub</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleSidebar}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="px-3 py-4 border-t border-gray-200 space-y-1">
          {bottomItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      </div>
    </>
  );
}