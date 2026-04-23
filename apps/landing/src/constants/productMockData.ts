import type { PublicProductService } from "@/components/FeatureBlock";

export const mockProductData: PublicProductService[] = [
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
