import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import FeatureBlock from "@/components/FeatureBlock";
import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import type { PublicProductService } from "@/components/FeatureBlock";

// Mock data - replace with API call when ready
const mockProductData: PublicProductService[] = [
  {
    id: "1",
    name: "Core Features",
    description: "#6366F1",
    url: "",
    confItems: [
      {
        id: "1-1",
        name: "Comprehensive Pedigree Management",
        description: "Create, edit, and manage unlimited generations of pedigrees with our intuitive interface",
        inventoryNumber: "sitemap",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "1-2",
        name: "Test Matings Calculator",
        description: "Plan your breeding programs with our advanced genetic calculator and COI analysis",
        inventoryNumber: "calculator",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "1-3",
        name: "Health Records Tracking",
        description: "Keep detailed health records, vaccinations, and medical history for all your pets",
        inventoryNumber: "heart",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
    ],
  },
  {
    id: "2",
    name: "Kennel Management",
    description: "#10B981",
    url: "",
    confItems: [
      {
        id: "2-1",
        name: "Professional Kennel Website",
        description: "Get a stunning, SEO-optimized website for your kennel with customizable themes",
        inventoryNumber: "globe",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "2-2",
        name: "Litter Management System",
        description: "Track litters from planning to placement, including weight charts and milestones",
        inventoryNumber: "users",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "2-3",
        name: "Client Communication Portal",
        description: "Stay connected with puppy buyers through our integrated messaging system",
        inventoryNumber: "comments",
        status: { id: "coming-soon", name: "Coming soon", url: "" },
        url: "",
      },
    ],
  },
  {
    id: "3",
    name: "Community & Social",
    description: "#EC4899",
    url: "",
    confItems: [
      {
        id: "3-1",
        name: "Breeder Network",
        description: "Connect with breeders worldwide, share knowledge, and find breeding partners",
        inventoryNumber: "share-alt",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "3-2",
        name: "Show Results Database",
        description: "Access comprehensive show results and track your competition achievements",
        inventoryNumber: "trophy",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "3-3",
        name: "Breed-Specific Forums",
        description: "Join discussions with other enthusiasts about your favorite breeds",
        inventoryNumber: "comments",
        status: { id: "coming-soon", name: "Coming soon", url: "" },
        url: "",
      },
    ],
  },
  {
    id: "4",
    name: "Analytics & Insights",
    description: "#F59E0B",
    url: "",
    confItems: [
      {
        id: "4-1",
        name: "Breeding Statistics",
        description: "Analyze your breeding program's success with detailed statistics and reports",
        inventoryNumber: "chart-bar",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "4-2",
        name: "Financial Tracking",
        description: "Monitor income and expenses related to your breeding activities",
        inventoryNumber: "wallet",
        status: { id: "coming-soon", name: "Coming soon", url: "" },
        url: "",
      },
      {
        id: "4-3",
        name: "Performance Analytics",
        description: "Track your kennel's performance metrics and compare with industry standards",
        inventoryNumber: "chart-line",
        status: { id: "coming-soon", name: "Coming soon", url: "" },
        url: "",
      },
    ],
  },
];

export default function Product() {
  const [services, setServices] = useState<PublicProductService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - replace with actual API integration
    const fetchProductData = async () => {
      try {
        // Uncomment when API is ready
        // const response = await fetch('https://dev.dogarray.com/0/BreedprideLandingApi/product');
        // const data = await response.json();
        // if (data.result?.isSuccess) {
        //   setServices(data.result.data.Services);
        // }
        
        // Using mock data for now
        setTimeout(() => {
          setServices(mockProductData);
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching product data:', error);
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, []);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Background SVG */}
      <div className="absolute right-[-30vw] top-[-13vw] w-full md:right-[-47vw] md:top-[-17vw] xxl:top-[-25vw] xxxl:top-[-32vw]">
        <LandingFigure style={{ width: "80%" }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header Section */}
        <div className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Everything You Need for
            <span className="text-primary-500"> Professional </span>
            Breeding
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the comprehensive suite of tools designed to streamline your breeding program, 
            connect with the community, and grow your kennel's success.
          </p>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-6 pb-20">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="mt-4 text-gray-600">Loading features...</p>
            </div>
          ) : (
            <div className="space-y-16">
              {services.map((service) => (
                <FeatureBlock key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary-50 to-pink-50 py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Transform Your Breeding Program?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of professional breeders who are already using BreedHub 
              to manage their breeding programs more efficiently.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/pricing">
                <button className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition duration-200">
                  View Pricing
                </button>
              </Link>
              <Link to="/app">
                <button className="bg-white hover:bg-gray-50 text-primary-500 font-bold py-4 px-8 rounded-xl shadow-lg transition duration-200 border-2 border-primary-500">
                  Try Free Forever
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="container mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <i className="pi pi-shield text-primary-500 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your data is protected with enterprise-grade security. Control who sees what.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <i className="pi pi-mobile text-green-500 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-2">Mobile Ready</h3>
              <p className="text-gray-600">
                Access your data anywhere with our mobile-optimized progressive web app.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <i className="pi pi-users text-purple-500 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-2">Community Driven</h3>
              <p className="text-gray-600">
                Built by breeders, for breeders. Your feedback shapes our development.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}