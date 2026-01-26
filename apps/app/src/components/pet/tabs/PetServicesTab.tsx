import { LitterCard, LitterData } from "@/components/shared/LitterCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib/utils";
import {
  CalendarClock,
  Handshake,
  Loader2,
  PawPrint,
  ShoppingCart,
  Snowflake,
  VenusAndMars,
} from "lucide-react";
import { useEffect, useMemo } from "react";

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

// Service type name → icon mapping
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "Pre reservation": <CalendarClock className="h-4 w-4" />,
  "Sale": <ShoppingCart className="h-4 w-4" />,
  "Mating": <VenusAndMars className="h-4 w-4" />,
  "Rent": <Handshake className="h-4 w-4" />,
  "Frozen sperm": <Snowflake className="h-4 w-4" />,
  "Children for sale": <PawPrint className="h-4 w-4" />,
};

// Default dataSource configs for services (using VIEWs with joined data)
const DEFAULT_SERVICES_DATASOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "pet_service_in_pet_with_details",
    parentField: "pet_id",
  },
};

const DEFAULT_FEATURES_DATASOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "pet_service_feature_in_pet_with_details",
    parentField: "pet_id",
  },
};

interface PetServicesTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig;
  featuresDataSource?: DataSourceConfig;
}

/**
 * PetServicesTab - Pet services and offers
 *
 * Displays:
 * 1. Children available for sale (if any) - using same LitterCard as PetChildrenTab
 * 2. Service cards (Sale, Mating, Rent, Frozen sperm)
 * 3. Service features as chips
 *
 * Data flow (Config-Driven, Local-First):
 * 1. dataSource config defines what to load
 * 2. useTabData → TabDataService → SpaceStore → RxDB
 * 3. Component transforms raw data for UI rendering
 *
 * Based on Angular: pet-services.component.ts
 */
export function PetServicesTab({
  onLoadedCount,
  dataSource,
  featuresDataSource,
}: PetServicesTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const petId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Load services via useTabData
  const {
    data: servicesRaw,
    isLoading: servicesLoading,
    error: servicesError
  } = useTabData({
    parentId: petId,
    dataSource: dataSource || DEFAULT_SERVICES_DATASOURCE,
    enabled: !!petId,
  });

  // Load features via useTabData
  const {
    data: featuresRaw,
    isLoading: featuresLoading,
  } = useTabData({
    parentId: petId,
    dataSource: featuresDataSource || DEFAULT_FEATURES_DATASOURCE,
    enabled: !!petId,
  });

  // Transform raw services data to UI format
  // Data comes from VIEW pet_service_in_pet_with_details with joined fields
  // Filter out "Children for sale" - it's displayed separately with actual children cards
  const services = useMemo<PetService[]>(() => {
    if (!servicesRaw || servicesRaw.length === 0) return [];

    return servicesRaw
      .filter((item: any) => {
        const typeName = item.additional?.service_type_name || item.service_type_name || "";
        return typeName.toLowerCase() !== "children for sale";
      })
      .map((item: any, index: number) => ({
        id: item.id,
        serviceTypeId: item.additional?.service_type_id || item.service_type_id,
        serviceTypeName: item.additional?.service_type_name || item.service_type_name || "Unknown",
        iconName: item.additional?.service_type_name || item.service_type_name || "sale",
        price: item.additional?.price ?? item.price,
        currencyName: item.additional?.currency_short_name || item.currency_short_name || item.additional?.currency_name || item.currency_name,
        order: index + 1,
      }));
  }, [servicesRaw]);

  // Check if pet has "Children for sale" service enabled
  const hasChildrenForSaleService = useMemo(() => {
    if (!servicesRaw || servicesRaw.length === 0) return false;
    return servicesRaw.some((item: any) => {
      const typeName = item.additional?.service_type_name || item.service_type_name || "";
      return typeName.toLowerCase() === "children for sale";
    });
  }, [servicesRaw]);

  // Transform raw features data to UI format
  // Data comes from VIEW pet_service_feature_in_pet_with_details with joined fields
  const features = useMemo<ServiceFeature[]>(() => {
    if (!featuresRaw || featuresRaw.length === 0) return [];

    return featuresRaw.map((item: any) => ({
      id: item.id,
      name: item.additional?.feature_name || item.feature_name || item.additional?.name || item.name || "Unknown",
    }));
  }, [featuresRaw]);

  // TODO: Load children for sale when hasChildrenForSaleService is true
  // Need to query pet's children with available_for_sale = true
  // For now, this section is hidden until children loading is implemented
  const littersForSale: LitterData[] = [];

  // Get pet sex from selected entity
  const petSexCode = selectedEntity?.additional?.sex?.code || "male";

  // Determine label for the other parent based on current pet's sex
  const anotherParentRole = petSexCode === "male" ? "Mother" : "Father";

  const isLoading = servicesLoading || featuresLoading;

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(services.length);
    }
  }, [isLoading, onLoadedCount, services.length]);

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading services...</span>
      </div>
    );
  }

  // Error state
  if (servicesError) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load services</p>
          <p className="text-red-600 text-sm mt-1">{servicesError.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (services.length === 0 && features.length === 0) {
    return (
      <div className="py-4 px-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
          <p className="text-slate-600">No services available for this pet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 px-6 cursor-default">
      {/* Children available for sale - using same LitterCard as PetChildrenTab */}
      {littersForSale.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <PawPrint className="h-4 w-4 text-secondary-400" />
            <span className="font-bold">Children available for sale</span>
          </div>
          <div className={cn("grid gap-3", isFullscreen && "lg:grid-cols-2")}>
            {littersForSale.map((litter, litterIndex) => (
              <LitterCard
                key={`${litter.date}-${litterIndex}`}
                litter={litter}
                anotherParentRole={anotherParentRole}
                isFullscreen={isFullscreen}
                className="bg-even-card-ground"
              />
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
            className="card card-rounded flex items-center space-x-5 p-6 lg:px-8 bg-even-card-ground"
          >
            <span className="text-secondary-400">
              {SERVICE_ICONS[service.serviceTypeName] || (
                <ShoppingCart className="h-4 w-4" />
              )}
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
              className=" text-base px-4 py-1"
            >
              {feature.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
