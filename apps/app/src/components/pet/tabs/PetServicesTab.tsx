import { useEffect } from "react";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib/utils";
import {
  PawPrint,
  CalendarClock,
  ShoppingCart,
  Handshake,
  Snowflake,
  VenusAndMars,
} from "lucide-react";

/**
 * Service type with icon mapping
 */
interface PetService {
  id: string;
  serviceTypeId: string;
  serviceTypeName: string;
  iconName: string;
  price?: number;
  currencyName?: string;
  order: number;
}

/**
 * Service feature (chip)
 */
interface ServiceFeature {
  id: string;
  name: string;
}

/**
 * Child for sale
 */
interface ChildForSale {
  id: string;
  name: string;
  avatarUrl?: string;
  slug?: string;
}

// Service type IDs → icons mapping
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "children-for-sale": <PawPrint className="h-4 w-4" />,
  "pre-reservation": <CalendarClock className="h-4 w-4" />,
  "sale": <ShoppingCart className="h-4 w-4" />,
  "mating": <VenusAndMars className="h-4 w-4" />,
  "rent": <Handshake className="h-4 w-4" />,
  "frozen-sperm": <Snowflake className="h-4 w-4" />,
};

// Mock data for visual development
const MOCK_SERVICES: PetService[] = [
  {
    id: "1",
    serviceTypeId: "ddc59ace-c622-4d6b-b473-19e9a313ed21",
    serviceTypeName: "Sale",
    iconName: "sale",
    price: 2500,
    currencyName: "USD",
    order: 1,
  },
  {
    id: "2",
    serviceTypeId: "ea48e37d-8f65-4122-bc00-d012848d78ae",
    serviceTypeName: "Mating",
    iconName: "mating",
    price: 1000,
    currencyName: "USD",
    order: 2,
  },
  {
    id: "3",
    serviceTypeId: "8a97a5df-a169-4b6e-b72b-7512106fdcf8",
    serviceTypeName: "Rent",
    iconName: "rent",
    order: 3,
  },
  {
    id: "4",
    serviceTypeId: "28655f5b-06d8-4308-ba0d-de2f5b9ef9bf",
    serviceTypeName: "Frozen sperm",
    iconName: "frozen-sperm",
    price: 500,
    currencyName: "EUR",
    order: 4,
  },
];

const MOCK_FEATURES: ServiceFeature[] = [
  { id: "1", name: "Delivery available" },
  { id: "2", name: "Health guarantee" },
  { id: "3", name: "Pedigree documents" },
  { id: "4", name: "Microchipped" },
  { id: "5", name: "Vaccinated" },
];

const MOCK_CHILDREN_FOR_SALE: ChildForSale[] = [
  { id: "1", name: "Puppy Max", slug: "puppy-max" },
  { id: "2", name: "Puppy Bella", slug: "puppy-bella" },
];

interface PetServicesTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * PetServicesTab - Pet services and offers
 *
 * Displays:
 * 1. Children available for sale (if any)
 * 2. Service cards (Sale, Mating, Rent, Frozen sperm)
 * 3. Service features as chips
 *
 * Based on Angular: pet-services.component.ts
 */
export function PetServicesTab({ onLoadedCount }: PetServicesTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from dataSource
  // For now using mock data
  const services = MOCK_SERVICES;
  const features = MOCK_FEATURES;
  const childrenForSale = MOCK_CHILDREN_FOR_SALE;

  // Report count after render
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(services.length);
    }
  }, [onLoadedCount, services.length]);

  return (
    <div className="flex flex-col space-y-8 px-6 cursor-default">
      {/* Children available for sale */}
      {childrenForSale.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <PawPrint className="h-4 w-4 text-secondary-400" />
            <span className="font-bold">Children available for sale</span>
          </div>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {childrenForSale.map((child) => (
              <div
                key={child.id}
                className="card flex items-center space-x-3 p-3 bg-even-card-ground"
              >
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <PawPrint className="h-5 w-5 text-gray-400" />
                </div>
                <span className="font-medium truncate">{child.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services grid */}
      <div
        className={cn(
          "grid gap-3",
          isFullscreen ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {services.map((service) => (
          <div
            key={service.id}
            className="card flex items-center space-x-5 p-6 lg:px-8 bg-even-card-ground"
          >
            <span className="text-secondary-400">
              {SERVICE_ICONS[service.iconName] || <ShoppingCart className="h-4 w-4" />}
            </span>
            <span className="font-bold">{service.serviceTypeName}</span>
            <div className="flex space-x-2 ml-auto">
              <span>Price:</span>
              {service.price && service.price > 0 ? (
                <>
                  <span className="font-semibold">{service.price}</span>
                  <span>{service.currencyName}</span>
                </>
              ) : (
                <span className="text-muted-foreground">is not specified</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Service features */}
      {features.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {features.map((feature) => (
            <Badge
              key={feature.id}
              variant="secondary"
              className="font-medium text-base px-4 py-1"
            >
              {feature.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
