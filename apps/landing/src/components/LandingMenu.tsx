import { LoadingButton } from "@/components/LoadingButton";
import { cn } from "@/utils";
import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { CreditCard, FileText, Menu, Smartphone, X } from "lucide-react";
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

  // Icon mapping
  const getIcon = () => {
    switch (to) {
      case "/product":
        return <Smartphone className="w-5 h-5 opacity-90" />;
      case "/pricing":
        return <CreditCard className="w-5 h-5 opacity-90" />;
      case "/about":
        return <FileText className="w-5 h-5 opacity-90" />;
      default:
        return null;
    }
  };

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 text-base font-bold rounded-full transition-all duration-200 inline-flex items-center gap-2",
        isActive
          ? isScrolled
            ? "text-primary-600 font-bold"
            : "text-white font-bold"
          : isScrolled
          ? "text-gray-700 hover:text-primary-600 font-medium"
          : "text-white hover:text-white font-medium"
      )}
      style={{
        backgroundColor: isActive
          ? isScrolled
            ? "rgb(233 221 249)" // більш насичений primary-100
            : "rgba(233, 221, 249, 0.2)" // primary-100 with 20% opacity
          : "transparent",
        border: "2px solid",
        borderColor: isActive
          ? isScrolled
            ? "rgb(233 221 249)" // same color as background
            : "rgba(233, 221, 249, 0.02)" // same color as background
          : "transparent", // transparent for inactive
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = isScrolled
            ? "rgba(107, 58, 183, 0.08)" // primary hover
            : "rgba(255, 255, 255, 0.15)";
          e.currentTarget.style.borderColor = isScrolled
            ? "rgba(0, 0, 0, 0.001)"
            : "rgba(255, 255, 255, 0.01)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.borderColor = "transparent";
        }
      }}
    >
      {getIcon()}
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
  const [scrollOpacity, setScrollOpacity] = useState(0);

  // Handle scroll for menu background
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);

      // Calculate opacity based on scroll position (0-100px range)
      const opacity = Math.min(scrollY / 100, 0.65);
      setScrollOpacity(opacity);
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
          backgroundColor: `rgba(255, 255, 255, ${scrollOpacity})`,
          backdropFilter:
            scrollOpacity > 0 ? `blur(${scrollOpacity * 12}px)` : "none",
          boxShadow:
            scrollOpacity > 0
              ? `0 4px 6px -1px rgba(0, 0, 0, ${scrollOpacity * 0.15})`
              : "none",
        }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          {/* Logo - Fixed position */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center relative z-10 p-2 -m-2 cursor-pointer logo-no-border"
            >
              <LogoText className="h-10 w-auto logo-no-border" />
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
                <a href="/sign-in">
                  <button className="landing-menu-button landing-menu-button-outline">
                    Sign In
                  </button>
                </a>
                <LoadingButton
                  to="/pricing"
                  className="landing-menu-button landing-menu-button-primary"
                  loadingText="Loading..."
                >
                  Get Started
                </LoadingButton>
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
            <a href="/sign-in">
              <button className="landing-menu-button landing-menu-button-outline">
                Sign In
              </button>
            </a>
            <LoadingButton
              to="/pricing"
              className="landing-menu-button landing-menu-button-primary"
              loadingText="Loading..."
            >
              Get Started
            </LoadingButton>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-3 min-w-[44px] min-h-[44px] text-gray-700 hover:text-primary-600 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="h-6 w-6" />
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
              <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">
                Menu
              </p>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-3 min-w-[44px] min-h-[44px] text-gray-500 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-200"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex flex-col p-4 space-y-6">
            {/* Services section */}
            <div>
              <p className="px-4 pb-2 text-sm font-bold text-gray-600 uppercase tracking-wider">
                Services
              </p>
              <div className="space-y-1">
                <Link
                  to="/product"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-base font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/product"
                      ? "text-primary-600 bg-primary-50 font-bold"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50 font-medium"
                  )}
                >
                  Product
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-base font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/pricing"
                      ? "text-primary-600 bg-primary-50 font-bold"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50 font-medium"
                  )}
                >
                  Pricing
                </Link>
                <Link
                  to="/sign-in"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-base font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/sign-in"
                      ? "text-primary-600 bg-primary-50 font-bold"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50 font-medium"
                  )}
                >
                  Sign In
                </Link>
                <Link
                  to="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-base font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/about"
                      ? "text-primary-600 bg-primary-50 font-bold"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50 font-medium"
                  )}
                >
                  About
                </Link>
              </div>
            </div>

            {/* Spaces section */}
            <div>
              <p className="px-4 pb-2 text-sm font-bold text-gray-600 uppercase tracking-wider">
                Spaces
              </p>
              <div className="space-y-1">
                {spaceItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "block px-4 py-2 ml-2 text-base font-medium rounded-md transition-colors duration-200",
                      location.pathname === item.to
                        ? "text-primary-600 bg-primary-50 font-bold"
                        : "text-gray-700 hover:text-primary-600 hover:bg-primary-50 font-medium"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Terms section */}
            <div>
              <p className="px-4 pb-2 text-sm font-bold text-gray-600 uppercase tracking-wider">
                Terms
              </p>
              <div className="space-y-1">
                <Link
                  to="/terms-and-conditions"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-base font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/terms-and-conditions"
                      ? "text-primary-600 bg-primary-50 font-bold"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50 font-medium"
                  )}
                >
                  Terms & Conditions
                </Link>
                <Link
                  to="/privacy-policy"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-2 ml-2 text-base font-medium rounded-md transition-colors duration-200",
                    location.pathname === "/privacy-policy"
                      ? "text-primary-600 bg-primary-50 font-bold"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50 font-medium"
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
              <a href="/auth/sign-in" className="block">
                <button
                  className="w-full rounded-md font-medium text-base py-3 px-5 text-primary-600 bg-transparent transition-all duration-300 min-h-[44px]"
                  style={{
                    border: `2px solid rgb(var(--primary-500) / 0.3)`,
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </button>
              </a>
              <Link to="/pricing" className="block">
                <button
                  className="w-full rounded-md font-medium text-base py-3 px-5 text-white bg-primary-500 transition-all duration-300 min-h-[44px]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
