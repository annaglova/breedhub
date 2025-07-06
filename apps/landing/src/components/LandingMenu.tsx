import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@ui/components/button';
import { cn } from '@/utils';
import LogoText from '@shared/icons/logo/logo-text.svg?react';

interface MenuItemProps {
  to: string;
  label: string;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ to, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
        isActive
          ? 'text-primary-600 bg-primary-50'
          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
      )}
    >
      {label}
    </Link>
  );
};

interface LandingMenuProps {
  className?: string;
}

export default function LandingMenu({ className }: LandingMenuProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for menu background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  const location = useLocation();
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const menuItems = [
    { to: '/product', label: 'Product' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/about', label: 'About' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Main Navigation */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          className
        )}
        style={{
          backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(8px)' : 'none',
          boxShadow: isScrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <LogoText className="h-8 w-auto" />
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-1">
                {menuItems.map((item) => (
                  <MenuItem key={item.to} to={item.to} label={item.label} />
                ))}
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center space-x-3 ml-6">
                <a href="/app">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </a>
                <Link to="/pricing">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="p-2"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden transition-opacity duration-300',
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar */}
        <div
          className={cn(
            'absolute right-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300',
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <LogoText className="h-8 w-auto" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex flex-col p-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'px-4 py-3 text-base font-medium rounded-md transition-colors duration-200',
                  location.pathname === item.to
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sidebar Auth Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
            <div className="space-y-2">
              <a href="/app" className="block">
                <Button variant="outline" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                  Sign In
                </Button>
              </a>
              <Link to="/pricing" className="block">
                <Button className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}