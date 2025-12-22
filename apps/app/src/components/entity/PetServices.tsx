import { cn } from "@ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import {
  PetServicesChildrenForSaleIcon,
  PetServicesPreReservationIcon,
  PetServicesSaleIcon,
  PetServicesMatingIcon,
  PetServicesRentIcon,
  PetServicesFrozenSpermIcon,
} from "@shared/icons";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";

// Services JSON format: {"1": "service_id", "2": "service_id", ...}
// This avoids RxDB array issues
type ServicesJson = Record<string, string>;

interface PetServicesProps {
  services?: ServicesJson;
  className?: string;
}

// Service type IDs -> icons mapping (icons are hardcoded, names from dictionary)
const SERVICE_ICONS: Record<string, { icon: React.ComponentType<any>; order: number }> = {
  "3370ee61-86de-49ae-a8ec-5cef5f213ecd": {
    icon: PetServicesChildrenForSaleIcon,
    order: 0,
  },
  "e922b16d-c0c0-46c6-af83-855ddad013f6": {
    icon: PetServicesPreReservationIcon,
    order: 0,
  },
  "ddc59ace-c622-4d6b-b473-19e9a313ed21": {
    icon: PetServicesSaleIcon,
    order: 1,
  },
  "ea48e37d-8f65-4122-bc00-d012848d78ae": {
    icon: PetServicesMatingIcon,
    order: 2,
  },
  "8a97a5df-a169-4b6e-b72b-7512106fdcf8": {
    icon: PetServicesRentIcon,
    order: 3,
  },
  "28655f5b-06d8-4308-ba0d-de2f5b9ef9bf": {
    icon: PetServicesFrozenSpermIcon,
    order: 4,
  },
};

/**
 * Single service icon with tooltip from dictionary
 */
function ServiceIcon({ serviceId }: { serviceId: string }) {
  const config = SERVICE_ICONS[serviceId];
  const serviceName = useDictionaryValue("pet_service", serviceId);

  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">
          <IconComponent
            className="w-4 h-4 fill-gray-400"
            width={16}
            height={16}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {serviceName || "Loading..."}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * PetServices - displays service icons for pets
 *
 * Used in: Pet, Litter list cards
 *
 * Services format: {"1": "service_id", "2": "service_id", ...}
 * Names loaded from pet_service dictionary
 */
export function PetServices({ services, className }: PetServicesProps) {
  if (!services || Object.keys(services).length === 0) return null;

  // Extract service IDs from JSON object and sort by order
  const serviceIds = Object.values(services)
    .filter((id) => SERVICE_ICONS[id])
    .sort((a, b) => {
      const orderA = SERVICE_ICONS[a]?.order ?? 999;
      const orderB = SERVICE_ICONS[b]?.order ?? 999;
      return orderA - orderB;
    });

  if (serviceIds.length === 0) return null;

  return (
    <div className={cn("flex space-x-1", className)}>
      {serviceIds.map((serviceId) => (
        <ServiceIcon key={serviceId} serviceId={serviceId} />
      ))}
    </div>
  );
}
