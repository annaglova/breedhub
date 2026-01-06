import { SalePetCard, type SalePet } from "@/components/shared/SalePetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import {
  CalendarClock,
  Handshake,
  PawPrint,
  ShoppingCart,
  Snowflake,
  VenusAndMars,
} from "lucide-react";
import { useEffect } from "react";

/**
 * Service type with icon mapping
 */
interface LitterService {
  id: string;
  serviceTypeId: string;
  serviceTypeName: string;
  iconName: string;
  price?: number;
  currencyName?: string;
}

// Service type → icons mapping
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "pre-reservation": <CalendarClock className="h-4 w-4" />,
  sale: <ShoppingCart className="h-4 w-4" />,
  "children-for-sale": <PawPrint className="h-4 w-4" />,
  mating: <VenusAndMars className="h-4 w-4" />,
  rent: <Handshake className="h-4 w-4" />,
  "frozen-sperm": <Snowflake className="h-4 w-4" />,
};

// Mock data for visual development
const MOCK_SERVICES: LitterService[] = [
  {
    id: "1",
    serviceTypeId: "3370ee61-86de-49ae-a8ec-5cef5f213ecd",
    serviceTypeName: "Puppies for sale",
    iconName: "children-for-sale",
    price: 2500,
    currencyName: "USD",
  },
  {
    id: "2",
    serviceTypeId: "pre-reservation-id",
    serviceTypeName: "Pre-reservation",
    iconName: "pre-reservation",
    price: 500,
    currencyName: "USD",
  },
];

const MOCK_PETS_FOR_SALE: SalePet[] = [
  {
    id: "1",
    name: "Alpha vom Königsberg",
    slug: "alpha-vom-konigsberg",
    avatarUrl: "/placeholder-pet.jpg",
    breed: { name: "German Shepherd", slug: "german-shepherd" },
    sex: { code: "male", name: "Male" },
    dateOfBirth: "2024-06-15",
    countryOfBirth: { code: "DE", name: "Germany" },
    father: {
      name: "Champion Rocky vom Haus",
      slug: "champion-rocky-vom-haus",
      avatarUrl: "/placeholder-pet.jpg",
    },
    mother: {
      name: "Luna of Golden Dreams",
      slug: "luna-of-golden-dreams",
      avatarUrl: "/placeholder-pet.jpg",
    },
    serviceFeatures: ["Vaccinated", "Microchipped", "Health guarantee"],
  },
  {
    id: "2",
    name: "Bella vom Königsberg",
    slug: "bella-vom-konigsberg",
    avatarUrl: "/placeholder-pet.jpg",
    breed: { name: "German Shepherd", slug: "german-shepherd" },
    sex: { code: "female", name: "Female" },
    dateOfBirth: "2024-06-15",
    countryOfBirth: { code: "DE", name: "Germany" },
    father: {
      name: "Champion Rocky vom Haus",
      slug: "champion-rocky-vom-haus",
      avatarUrl: "/placeholder-pet.jpg",
    },
    mother: {
      name: "Luna of Golden Dreams",
      slug: "luna-of-golden-dreams",
      avatarUrl: "/placeholder-pet.jpg",
    },
    serviceFeatures: ["Vaccinated", "Microchipped"],
  },
];

interface LitterServicesTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * LitterServicesTab - Litter services and pets for sale
 *
 * Displays:
 * 1. Service cards (icon, service type, price)
 * 2. Pets for sale cards
 *
 * Based on Angular: litter-offers.component.ts
 */
export function LitterServicesTab({ onLoadedCount }: LitterServicesTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity
  // For now using mock data
  const services = MOCK_SERVICES;
  const petsForSale = MOCK_PETS_FOR_SALE;

  // Report count after render
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(services.length + petsForSale.length);
    }
  }, [onLoadedCount, services.length, petsForSale.length]);

  return (
    <div className="mt-3 flex flex-col space-y-8 px-6">
      {/* Services */}
      {services.map((service) => (
        <div
          key={service.id}
          className="card card-rounded flex flex-auto items-center space-x-5 p-6 lg:px-8"
        >
          <span className="text-secondary-400">
            {SERVICE_ICONS[service.iconName] || (
              <ShoppingCart className="h-4 w-4" />
            )}
          </span>
          <span className="font-bold text-secondary">
            {service.serviceTypeName}
          </span>
          <div className="flex space-x-2">
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

      {/* Pets for sale */}
      {petsForSale.length > 0 && (
        <div
          className={cn(
            "grid gap-6",
            isFullscreen ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}
        >
          {petsForSale.map((pet) => (
            <SalePetCard key={pet.id} pet={pet} />
          ))}
        </div>
      )}
    </div>
  );
}
