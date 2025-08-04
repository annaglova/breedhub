import React from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '@ui/components/button';
import { useApp } from '@/store/hooks';
import { cn } from '@/shared/utils';
import {
  LayoutDashboard,
  Heart,
  Package,
  Users,
  Building2,
  UserPlus,
  Calendar,
  User,
  Settings,
  ChevronLeft,
  X
} from 'lucide-react';

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
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: 'Dashboard',
    },
    {
      to: '/pets',
      icon: <Heart className="h-5 w-5" />,
      label: 'Pets',
    },
    {
      to: '/breeds',
      icon: <Package className="h-5 w-5" />,
      label: 'Breeds',
    },
    {
      to: '/litters',
      icon: <Users className="h-5 w-5" />,
      label: 'Litters',
    },
    {
      to: '/kennels',
      icon: <Building2 className="h-5 w-5" />,
      label: 'Kennels',
    },
    {
      to: '/contacts',
      icon: <UserPlus className="h-5 w-5" />,
      label: 'Contacts',
    },
    {
      to: '/events',
      icon: <Calendar className="h-5 w-5" />,
      label: 'Events',
    },
  ];

  const bottomItems = [
    {
      to: '/profile',
      icon: <User className="h-5 w-5" />,
      label: 'Profile',
    },
    {
      to: '/settings',
      icon: <Settings className="h-5 w-5" />,
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
            <ChevronLeft className={cn('h-5 w-5 transition-transform', sidebarOpen && 'rotate-180')} />
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
            <X className="h-5 w-5" />
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