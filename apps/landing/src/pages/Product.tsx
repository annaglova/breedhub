import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import type { PublicProductService } from "@/components/FeatureBlock";
import FeatureBlock from "@/components/FeatureBlock";
import { usePageTitle } from "@/hooks/usePageTitle";
import LandingLayout from "@/layouts/LandingLayout";
import { landingService } from "@/services/api.service";
import { Shield, Smartphone, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
        {/* Background container - 4/5 screen height, left aligned with content, right to edge */}
        <div className="absolute top-0 right-0 h-[80vh] -z-1 left-[max(1.5rem,calc(50%-30.5rem))] overflow-hidden">
          <LandingFigure
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMax slice"
          />
        </div>

        {/* Hero Section */}
        <div className="pt-14 pb-40 sm:pt-32 sm:pb-52">
          <div className="landing-content-container">
            <div className="text-center space-y-3">
              <h1 className="text-white tracking-tight leading-tight">
                Everything You Need for Professional Breeding
              </h1>
              <p className="text-2xl text-white/90 max-w-3xl mx-auto mt-2 tracking-wide leading-relaxed">
                Discover the comprehensive suite of tools designed to streamline your breeding program, connect with the community, and grow your kennel's success
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="landing-content-container -mt-32 sm:-mt-44 relative z-10">
          <div className="landing-content-card">
            {isLoading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                <p className="mt-4 text-slate-600">Loading features...</p>
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
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full backdrop-blur-sm shadow-md">
                <svg
                  className="w-10 h-10 text-white "
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

              <h2 className="text-5xl font-bold mb-6 text-white tracking-tight leading-tight">
                Ready to Transform Your Breeding Program?
              </h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed tracking-wide">
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
              <h3 className="text-xl font-bold mb-2 tracking-wide">
                Secure & Private
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Your data is protected with enterprise-grade security. Control
                who sees what.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Smartphone className="text-green-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-wide">
                Mobile Ready
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Access your data anywhere with our mobile-optimized progressive
                web app.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Users className="text-purple-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-wide">
                Community Driven
              </h3>
              <p className="text-slate-600 leading-relaxed">
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
