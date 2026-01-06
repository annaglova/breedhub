import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib/utils";
import {
  CalendarClock,
  CheckCircle,
  Clock,
  PawPrint,
  ShoppingCart,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Service offer for litter (puppies for sale, pre-reservation, etc.)
 */
interface LitterService {
  id: string;
  serviceTypeId: string;
  serviceTypeName: string;
  iconName: string;
  status?: {
    id: string;
    name: string;
  };
  price?: number;
  currencyName?: string;
  order: number;
}

/**
 * Puppy available from this litter
 */
interface LitterPuppy {
  id: string;
  name: string;
  slug?: string;
  sex?: {
    code: string;
    name: string;
  };
  status?: string;
  price?: number;
  currencyName?: string;
}

// Service type → icons mapping
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "pre-reservation": <CalendarClock className="h-4 w-4" />,
  sale: <ShoppingCart className="h-4 w-4" />,
  "children-for-sale": <PawPrint className="h-4 w-4" />,
};

// Status → icons mapping
const STATUS_ICONS: Record<string, React.ReactNode> = {
  available: <CheckCircle className="h-4 w-4 text-green-500" />,
  reserved: <Clock className="h-4 w-4 text-yellow-500" />,
  sold: <CheckCircle className="h-4 w-4 text-slate-400" />,
};

// Mock data for visual development
const MOCK_SERVICES: LitterService[] = [
  {
    id: "1",
    serviceTypeId: "3370ee61-86de-49ae-a8ec-5cef5f213ecd",
    serviceTypeName: "Puppies for sale",
    iconName: "children-for-sale",
    status: { id: "1", name: "Available" },
    price: 2500,
    currencyName: "USD",
    order: 1,
  },
  {
    id: "2",
    serviceTypeId: "pre-reservation-id",
    serviceTypeName: "Pre-reservation",
    iconName: "pre-reservation",
    status: { id: "2", name: "Open" },
    price: 500,
    currencyName: "USD",
    order: 2,
  },
];

const MOCK_PUPPIES: LitterPuppy[] = [
  {
    id: "1",
    name: "Alpha vom Königsberg",
    slug: "alpha-vom-konigsberg",
    sex: { code: "male", name: "Male" },
    status: "available",
    price: 2500,
    currencyName: "USD",
  },
  {
    id: "2",
    name: "Bella vom Königsberg",
    slug: "bella-vom-konigsberg",
    sex: { code: "female", name: "Female" },
    status: "reserved",
    price: 2800,
    currencyName: "USD",
  },
  {
    id: "3",
    name: "Charlie vom Königsberg",
    slug: "charlie-vom-konigsberg",
    sex: { code: "male", name: "Male" },
    status: "available",
    price: 2500,
    currencyName: "USD",
  },
  {
    id: "4",
    name: "Daisy vom Königsberg",
    slug: "daisy-vom-konigsberg",
    sex: { code: "female", name: "Female" },
    status: "sold",
  },
];

const MOCK_FEATURES = [
  { id: "1", name: "Health guarantee" },
  { id: "2", name: "Pedigree documents" },
  { id: "3", name: "Microchipped" },
  { id: "4", name: "Vaccinated" },
  { id: "5", name: "Delivery available" },
];

interface LitterServicesTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * LitterServicesTab - Litter services and offers
 *
 * Displays:
 * 1. Service cards (Puppies for sale, Pre-reservation)
 * 2. Available puppies list
 * 3. Service features as chips
 *
 * Based on Angular: litter-offers-form.component.ts
 */
export function LitterServicesTab({ onLoadedCount }: LitterServicesTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity/dataSource
  // For now using mock data
  const services = MOCK_SERVICES;
  const puppies = MOCK_PUPPIES;
  const features = MOCK_FEATURES;

  // Report count after render
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(services.length + puppies.length);
    }
  }, [onLoadedCount, services.length, puppies.length]);

  return (
    <div className="flex flex-col space-y-8 px-6 cursor-default">
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
            className="card card-rounded flex items-center space-x-5 p-6 lg:px-8 bg-even-card-ground"
          >
            <span className="text-secondary-400">
              {SERVICE_ICONS[service.iconName] || (
                <ShoppingCart className="h-4 w-4" />
              )}
            </span>
            <span className="font-bold">{service.serviceTypeName}</span>
            {service.status && (
              <Badge variant="secondary" className="ml-2">
                {service.status.name}
              </Badge>
            )}
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

      {/* Available puppies */}
      {puppies.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <PawPrint className="h-4 w-4 text-secondary-400" />
            <span className="font-bold">Available puppies</span>
            <Badge variant="secondary" className="ml-2">
              {puppies.filter((p) => p.status === "available").length} available
            </Badge>
          </div>

          <div
            className={cn(
              "grid gap-3",
              isFullscreen ? "lg:grid-cols-2" : "grid-cols-1"
            )}
          >
            {puppies.map((puppy) => (
              <div
                key={puppy.id}
                className={cn(
                  "card card-rounded flex items-center space-x-4 p-4 lg:px-6 bg-even-card-ground",
                  puppy.status === "sold" && "opacity-60"
                )}
              >
                {/* Sex indicator */}
                <div
                  className={cn(
                    "size-3 rounded-full shrink-0",
                    puppy.sex?.code === "male"
                      ? "bg-blue-400"
                      : puppy.sex?.code === "female"
                        ? "bg-pink-400"
                        : "bg-slate-400"
                  )}
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  {puppy.slug ? (
                    <Link
                      to={`/${puppy.slug}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {puppy.name}
                    </Link>
                  ) : (
                    <span className="font-medium truncate block">
                      {puppy.name}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center space-x-1">
                  {STATUS_ICONS[puppy.status || "available"]}
                  <span
                    className={cn(
                      "text-sm capitalize",
                      puppy.status === "available" && "text-green-600",
                      puppy.status === "reserved" && "text-yellow-600",
                      puppy.status === "sold" && "text-slate-500"
                    )}
                  >
                    {puppy.status || "Available"}
                  </span>
                </div>

                {/* Price */}
                {puppy.price && puppy.status !== "sold" && (
                  <div className="flex space-x-1 text-sm">
                    <span className="font-semibold">{puppy.price}</span>
                    <span>{puppy.currencyName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service features */}
      {features.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {features.map((feature) => (
            <Badge
              key={feature.id}
              variant="secondary"
              className="text-base px-4 py-1"
            >
              {feature.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
