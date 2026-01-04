import { cn } from "@/utils";
import LogoTextWhite from "@shared/icons/logo/logo-text-white.svg?react";
import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Button } from "@ui/components/button";
import {
  Archive,
  ChevronDown,
  FileText,
  Globe,
  Info,
  Lock,
  Menu,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface MenuItemProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  onClick?: () => void;
}

interface DropdownMenuProps {
  label: string;
  items: MenuItemProps[];
  icon?: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ label, items, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-1 px-4 py-2 text-sm  rounded-md transition-colors duration-200",
          "text-slate-700 hover:text-primary-600 hover:bg-slate-50"
        )}
      >
        {icon && <span className="h-4 w-4">{icon}</span>}
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start space-x-3">
                {item.icon && (
                  <span className="h-5 w-5 text-slate-400 mt-0.5">
                    {item.icon}
                  </span>
                )}
                <div>
                  <div className="text-sm  text-slate-900">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

interface LandingMenuAdvancedProps {
  className?: string;
  variant?: "default" | "transparent" | "floating";
}

export default function LandingMenuAdvanced({
  className,
  variant = "default",
}: LandingMenuAdvancedProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll for menu background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const menuItems = [
    { to: "/product", label: "Product" },
    { to: "/pricing", label: "Pricing" },
    { to: "/about", label: "About" },
  ];

  const productDropdownItems: MenuItemProps[] = [
    {
      to: "/product",
      label: "Features",
      description: "Explore all product features",
      icon: <Zap />,
    },
    {
      to: "/product#pedigree",
      label: "Pedigree Management",
      description: "Track lineages and breeding history",
      icon: <Archive />,
    },
    {
      to: "/product#kennel",
      label: "Kennel Website",
      description: "Create your professional kennel site",
      icon: <Globe />,
    },
  ];

  const resourcesDropdownItems: MenuItemProps[] = [
    {
      to: "/about",
      label: "About Us",
      description: "Learn about our mission",
      icon: <Info />,
    },
    {
      to: "/terms",
      label: "Terms & Conditions",
      description: "Read our terms of service",
      icon: <FileText />,
    },
    {
      to: "/privacy",
      label: "Privacy Policy",
      description: "How we protect your data",
      icon: <Lock />,
    },
  ];

  const getMenuStyles = () => {
    const baseStyles =
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300";

    switch (variant) {
      case "transparent":
        return cn(
          baseStyles,
          isScrolled
            ? "bg-white/95 backdrop-blur-sm shadow-md"
            : "bg-transparent"
        );
      case "floating":
        return cn(
          baseStyles,
          "mx-4 mt-4 rounded-2xl",
          isScrolled
            ? "bg-white shadow-lg"
            : "bg-white/80 backdrop-blur-sm shadow-md"
        );
      default:
        return cn(baseStyles, "bg-white border-b border-slate-200");
    }
  };

  return (
    <>
      {/* Main Navigation */}
      <nav className={cn(getMenuStyles(), className)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center group">
                {variant === "transparent" && !isScrolled ? (
                  <LogoTextWhite className="h-8 w-auto transition-opacity group-hover:opacity-80" />
                ) : (
                  <LogoText className="h-8 w-auto transition-opacity group-hover:opacity-80" />
                )}
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-8">
              <div className="flex items-center space-x-1">
                <DropdownMenu label="Product" items={productDropdownItems} />

                <Link
                  to="/pricing"
                  className={cn(
                    "px-4 py-2 text-sm  rounded-md transition-colors duration-200",
                    location.pathname === "/pricing"
                      ? "text-primary-600 bg-primary-50"
                      : "text-slate-700 hover:text-primary-600 hover:bg-slate-50"
                  )}
                >
                  Pricing
                </Link>

                <DropdownMenu
                  label="Resources"
                  items={resourcesDropdownItems}
                />
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center space-x-3 ml-6">
                <a href="/app">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </a>
                <Link to="/pricing">
                  <Button
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar with slide animation */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-all duration-300",
          isMobileMenuOpen ? "visible" : "invisible"
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black transition-opacity duration-300",
            isMobileMenuOpen ? "opacity-50" : "opacity-0"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar */}
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-xl transform transition-transform duration-300",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
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
              <X className="h-5 w-5" />
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
                  "px-4 py-3 text-base  rounded-md transition-colors duration-200",
                  location.pathname === item.to
                    ? "text-primary-600 bg-primary-50"
                    : "text-slate-700 hover:text-primary-600 hover:bg-slate-50"
                )}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile dropdown sections */}
            <div className="border-t pt-4 mt-4">
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Product Features
              </div>
              {productDropdownItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-600 hover:text-primary-600"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resources
              </div>
              {resourcesDropdownItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-600 hover:text-primary-600"
                >
                  {item.label}
                </Link>
              ))}
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
                  className="w-full bg-primary-600 hover:bg-primary-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
