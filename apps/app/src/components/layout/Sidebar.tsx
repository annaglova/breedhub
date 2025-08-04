import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Dog, Cat, Users, Calendar, MessageSquare, Baby } from 'lucide-react';
import { Button } from '@ui/components/button';
import { cn } from '@ui/lib/utils';

interface SidebarProps {
  isCollapsed?: boolean;
  onClose?: () => void;
  className?: string;
  asMenu?: boolean;
}

export function Sidebar({ isCollapsed = false, onClose, className, asMenu = false }: SidebarProps) {
  const location = useLocation();

  // Menu items based on active section
  const menuItems = [
    { 
      id: 'breeds', 
      icon: Dog, 
      label: 'Breeds', 
      path: '/breeds',
      section: 'home'
    },
    { 
      id: 'pets', 
      icon: Cat, 
      label: 'Pets', 
      path: '/pets',
      section: 'home'
    },
    { 
      id: 'litters', 
      icon: Baby, 
      label: 'Litters', 
      path: '/litters',
      section: 'home'
    },
    { 
      id: 'kennels', 
      icon: Users, 
      label: 'Kennels', 
      path: '/kennels',
      section: 'home'
    },
    { 
      id: 'contacts', 
      icon: MessageSquare, 
      label: 'Contacts', 
      path: '/contacts',
      section: 'home'
    },
    { 
      id: 'events', 
      icon: Calendar, 
      label: 'Events', 
      path: '/events',
      section: 'home'
    },
  ];

  // TODO: Filter menu items based on active section (home/market/menu)
  const activeSection = 'home'; // for now
  const visibleMenuItems = menuItems.filter(item => item.section === activeSection);

  return (
    <aside className={cn("h-full flex flex-col", className)}>
      {/* Logo and close button */}
      {!asMenu && (
        <div className="h-16 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <img 
              src="/logo.svg" 
              alt="BreedHub" 
              className="h-8"
            />
          </Link>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 p-4">
        <h2 className="text-primary font-bold text-sm mb-4">SPACES</h2>
        <ul className="space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-gray-200",
                    isActive && "bg-gray-200 text-gray-900 font-medium",
                    isCollapsed && "justify-center"
                  )}
                  onClick={onClose}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}