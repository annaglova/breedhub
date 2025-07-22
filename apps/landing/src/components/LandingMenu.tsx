import { cn } from "@/utils";
import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Button } from "@ui/components/button";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface MenuItemProps {
  to: string;
  label: string;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps & { isScrolled?: boolean }> = ({
  to,
  label,
  onClick,
  isScrolled,
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-base font-medium rounded-full transition-all duration-200",
        isActive
          ? "text-primary-600"
          : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
      )}
      style={{
        backgroundColor: isActive
          ? isScrolled
            ? "rgb(237 231 246)" // primary-50 full opacity
            : "rgba(237, 231, 246, 0.75)" // primary-50 with 75% opacity
          : "transparent",
      }}
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

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  const location = useLocation();
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const spaceItems = [
    { to: "/pets", label: "Pets" },
    { to: "/litters", label: "Litters" },
    { to: "/kennels", label: "Kennels" },
    { to: "/breeds", label: "Breeds" },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Main Navigation */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isMobileMenuOpen &&
            "md:opacity-100 opacity-30 pointer-events-none md:pointer-events-auto",
          isScrolled && "menu-scrolled",
          className
        )}
        style={{
          backgroundColor: isScrolled
            ? "rgba(255, 255, 255, 0.65)"
            : "transparent",
          backdropFilter: isScrolled ? "blur(8px)" : "none",
          boxShadow: isScrolled ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          {/* Logo - Fixed position */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center cursor-pointer relative z-10"
            >
              <LogoText className="h-9 w-auto cursor-pointer" />
            </Link>
          </div>

          {/* Desktop Menu - Different layout based on screen size */}
          <div className="hidden md:flex items-center">
            {/* Menu for screens < 1536px - standard layout */}
            <div className="2xl:hidden flex items-center space-x-8">
              {/* Menu items */}
              <div className="flex items-center space-x-1">
                <MenuItem
                  to="/product"
                  label="Product"
                  isScrolled={isScrolled}
                />
                <MenuItem
                  to="/pricing"
                  label="Pricing"
                  isScrolled={isScrolled}
                />
                <MenuItem to="/about" label="About" isScrolled={isScrolled} />
              </div>

              {/* Auth buttons */}
              <div className="flex items-center space-x-3">
                <a href="/app">
                  <button className="landing-menu-button landing-menu-button-outline">
                    Sign In
                  </button>
                </a>
                <Link to="/pricing">
                  <button className="landing-menu-button landing-menu-button-primary">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>

            {/* Menu for screens >= 1536px (2xl) - container-based layout */}
            <div className="hidden 2xl:flex items-center justify-center absolute left-0 right-0">
              <div className="landing-content-container">
                <div className="flex items-center justify-end space-x-1">
                  <MenuItem
                    to="/product"
                    label="Product"
                    isScrolled={isScrolled}
                  />
                  <MenuItem
                    to="/pricing"
                    label="Pricing"
                    isScrolled={isScrolled}
                  />
                  <MenuItem to="/about" label="About" isScrolled={isScrolled} />
                </div>
              </div>
            </div>
          </div>

          {/* Auth Buttons for 2xl screens - Fixed position */}
          <div className="hidden 2xl:flex items-center space-x-3">
            <a href="/app">
              <button className="landing-menu-button landing-menu-button-outline">
                Sign In
              </button>
            </a>
            <Link to="/pricing">
              <button className="landing-menu-button landing-menu-button-primary">
                Get Started
              </button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-700 hover:text-primary-600 transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-[60] md:hidden transition-opacity duration-300",
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
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
            "absolute right-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{
            backgroundColor: "white",
            opacity: 1,
          }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block"
            >
              <h2 className="text-xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                Breedhub
              </h2>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Menu
              </p>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-200"
              aria-label="Close menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex flex-col p-4 space-y-6">
            {/* Services section */}
            <div>
              <p className="px-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Services
              </p>
              <div className="space-y-1">
                <Link
                  to="/product"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-sm font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/product"
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  )}
                >
                  Product
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-sm font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/pricing"
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  )}
                >
                  Pricing
                </Link>
                <Link
                  to="/app"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-sm font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/app"
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  )}
                >
                  App
                </Link>
                <Link
                  to="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-sm font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/about"
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  )}
                >
                  About
                </Link>
              </div>
            </div>

            {/* Spaces section */}
            <div>
              <p className="px-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Spaces
              </p>
              <div className="space-y-1">
                {spaceItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "block px-4 py-2 ml-2 text-sm font-medium rounded-md transition-colors duration-200",
                      location.pathname === item.to
                        ? "text-primary-600 bg-primary-50"
                        : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Terms section */}
            <div>
              <p className="px-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Terms
              </p>
              <div className="space-y-1">
                <Link
                  to="/terms-and-conditions"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-sm font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/terms-and-conditions"
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  )}
                >
                  Terms & Conditions
                </Link>
                <Link
                  to="/privacy-policy"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-sm font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/privacy-policy"
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  )}
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </nav>

          {/* Sidebar Auth Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
            <div className="space-y-2">
              <a href="/app" className="block">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Button>
              </a>
              <Link to="/pricing" className="block">
                <Button
                  className="w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
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
