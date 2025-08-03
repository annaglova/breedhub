import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import type { PublicProductService } from "@/components/FeatureBlock";
import FeatureBlock from "@/components/FeatureBlock";
import LandingLayout from "@/layouts/LandingLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { landingService } from "@/services/api.service";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Smartphone, Users } from "lucide-react";

// Mock data - replace with API call when ready
const mockProductData: PublicProductService[] = [
  {
    id: "1",
    name: "Core Features",
    color: "#6366F1",
    url: "",
    confItems: [
      {
        id: "1-1",
        name: "Comprehensive Pedigree Management",
        description:
          "Create, edit, and manage unlimited generations of pedigrees with our intuitive interface",
        icon: "sitemap",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "1-2",
        name: "Test Matings Calculator",
        description:
          "Plan your breeding programs with our advanced genetic calculator and COI analysis",
        icon: "calculator",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "1-3",
        name: "Health Records Tracking",
        description:
          "Keep detailed health records, vaccinations, and medical history for all your pets",
        icon: "heart",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
    ],
  },
  {
    id: "2",
    name: "Kennel Management",
    color: "#10B981",
    url: "",
    confItems: [
      {
        id: "2-1",
        name: "Professional Kennel Website",
        description:
          "Get a stunning, SEO-optimized website for your kennel with customizable themes",
        icon: "globe",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "2-2",
        name: "Litter Management System",
        description:
          "Track litters from planning to placement, including weight charts and milestones",
        icon: "users",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "2-3",
        name: "Client Communication Portal",
        description:
          "Stay connected with puppy buyers through our integrated messaging system",
        icon: "comments",
        status: { id: "coming-soon", name: "Coming soon", url: "" },
        url: "",
      },
    ],
  },
  {
    id: "3",
    name: "Community & Social",
    color: "#EC4899",
    url: "",
    confItems: [
      {
        id: "3-1",
        name: "Breeder Network",
        description:
          "Connect with breeders worldwide, share knowledge, and find breeding partners",
        icon: "share-alt",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "3-2",
        name: "Show Results Database",
        description:
          "Access comprehensive show results and track your competition achievements",
        icon: "trophy",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "3-3",
        name: "Breed-Specific Forums",
        description:
          "Join discussions with other enthusiasts about your favorite breeds",
        icon: "comments",
        status: { id: "coming-soon", name: "Coming soon", url: "" },
        url: "",
      },
    ],
  },
  {
    id: "4",
    name: "Analytics & Insights",
    color: "#F59E0B",
    url: "",
    confItems: [
      {
        id: "4-1",
        name: "Breeding Statistics",
        description:
          "Analyze your breeding program's success with detailed statistics and reports",
        icon: "chart-bar",
        status: { id: "active", name: "", url: "" },
        url: "",
      },
      {
        id: "4-2",
        name: "Financial Tracking",
        description:
          "Monitor income and expenses related to your breeding activities",
        icon: "wallet",
        status: { id: "coming-soon", name: "Coming soon", url: "" },
        url: "",
      },
      {
        id: "4-3",
        name: "Performance Analytics",
        description:
          "Track your kennel's performance metrics and compare with industry standards",
        icon: "chart-line",
        status: { id: "coming-soon", name: "Coming soon", url: "" },
        url: "",
      },
    ],
  },
];

export default function Product() {
  usePageTitle("Features");

  const [services, setServices] = useState<PublicProductService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setIsLoading(true);

        // Try to fetch real data from Supabase
        const services = await landingService.getActiveServices();

        if (services && services.length > 0) {
          // Transform service_item data to match component structure
          const transformedData: PublicProductService[] = services.map(
            (service: any) => ({
              id: service.id,
              name: service.name,
              color: service.color || "#6366F1",
              url: service.url || "",
              confItems: service.confItems || [], // Use real conf_items from database
            })
          );

          setServices(transformedData);
        } else {
          // Fallback to mock data if no real data available
          console.log("No services found, using mock data");
          setServices(mockProductData);
        }
      } catch (error) {
        console.error("Error fetching product data:", error);
        // Fallback to mock data on error
        setServices(mockProductData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, []);

  return (
    <LandingLayout>
      <div className="relative overflow-hidden">
        {/* Background SVG */}
        <div className="absolute right-[-7vw] top-[-23vw] w-full md:right-[-17vw] md:top-[-27vw] xxl:top-[-35vw] xxxl:top-[-42vw] -z-1">
          <LandingFigure style={{ width: "100%" }} />
        </div>
        {/* Content */}
        <div className="flex flex-col items-center justify-center pt-14 sm:pt-32">
          <div className="landing-content-container">
            {/* Header Section */}
            <div className="relative space-y-3 text-center">
              <h1 className="text-white">
                Everything You Need for Professional Breeding
              </h1>
              <p className="text-2xl text-gray-600 xl:text-white max-w-3xl mx-auto mt-2">
                Discover the comprehensive suite of tools designed to streamline
                your breeding program, connect with the community, and grow your
                kennel's success
              </p>
            </div>

            {/* Features Section */}
            <div className="landing-content-card">
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
          </div>
        </div>{" "}
        {/* CTA Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-accent-500 opacity-90"></div>

          {/* Background SVG Pattern */}
          <div className="absolute inset-0 opacity-10">
            <LandingFigure className="absolute -right-1/4 -top-1/4 w-full h-full transform rotate-12" />
            <LandingFigure className="absolute -left-1/4 -bottom-1/4 w-full h-full transform -rotate-12" />
          </div>

          <div className="relative z-10 container mx-auto px-6 py-16">
            <div className="text-center">
              {/* Icon */}
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full backdrop-blur-sm">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              <h2 className="text-5xl font-bold mb-6 text-white">
                Ready to Transform Your Breeding Program?
              </h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of professional breeders who are already using
                BreedHub to manage their breeding programs more efficiently.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/pricing">
                  <button className="group landing-cta-button landing-cta-button-primary">
                    <span className="text-lg">View Pricing</span>
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </button>
                </Link>
                <Link to="/app">
                  <button className="group landing-cta-button landing-cta-button-outline">
                    <span className="text-lg">Try Free Forever</span>
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* Additional Info Section */}
        <div className="container mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Shield className="text-primary-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your data is protected with enterprise-grade security. Control
                who sees what.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Smartphone className="text-green-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Mobile Ready</h3>
              <p className="text-gray-600">
                Access your data anywhere with our mobile-optimized progressive
                web app.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Users className="text-purple-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Community Driven</h3>
              <p className="text-gray-600">
                Built by breeders, for breeders. Your feedback shapes our
                development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
