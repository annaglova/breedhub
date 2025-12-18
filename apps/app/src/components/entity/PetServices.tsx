import { cn } from "@ui/lib/utils";
import { Baby, Tag, Heart, KeyRound, Snowflake, ShoppingBag } from "lucide-react";

interface PetServiceData {
  ServiceType?: { Id?: string; Name?: string };
  [key: string]: any;
}

interface PetServicesProps {
  services?: PetServiceData[];
  className?: string;
}

// Service type IDs mapping
const SERVICE_CONFIG: Record<
  string,
  { icon: React.ComponentType<any>; name: string; order: number }
> = {
  "3370ee61-86de-49ae-a8ec-5cef5f213ecd": {
    icon: Baby,
    name: "Children for sale",
    order: 0,
  },
  "e922b16d-c0c0-46c6-af83-855ddad013f6": {
    icon: ShoppingBag,
    name: "Pre reservation",
    order: 0,
  },
  "ddc59ace-c622-4d6b-b473-19e9a313ed21": {
    icon: Tag,
    name: "Sale",
    order: 1,
  },
  "ea48e37d-8f65-4122-bc00-d012848d78ae": {
    icon: Heart,
    name: "Mating",
    order: 2,
  },
  "8a97a5df-a169-4b6e-b72b-7512106fdcf8": {
    icon: KeyRound,
    name: "Rent",
    order: 3,
  },
  "28655f5b-06d8-4308-ba0d-de2f5b9ef9bf": {
    icon: Snowflake,
    name: "Frozen sperm",
    order: 4,
  },
};

/**
 * PetServices - displays service icons for pets
 *
 * Used in: Pet, Litter list cards
 *
 * Shows icons for different services:
 * - Children for sale
 * - Pre reservation
 * - Sale
 * - Mating
 * - Rent
 * - Frozen sperm
 */
export function PetServices({ services, className }: PetServicesProps) {
  if (!services || services.length === 0) return null;

  // Transform and sort services
  const transformedServices = services
    .map((service) => {
      const typeId = service.ServiceType?.Id;
      const config = typeId ? SERVICE_CONFIG[typeId] : null;

      if (!config) return null;

      return {
        ...config,
        id: typeId,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.order > b!.order ? 1 : -1));

  if (transformedServices.length === 0) return null;

  return (
    <div className={cn("flex space-x-1", className)}>
      {transformedServices.map((service) => {
        if (!service) return null;
        const IconComponent = service.icon;

        return (
          <IconComponent
            key={service.id}
            className="w-4 h-4 text-gray-400"
            title={service.name}
          />
        );
      })}
    </div>
  );
}
